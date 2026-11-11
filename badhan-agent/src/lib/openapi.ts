// Turns the backend's OpenAPI spec into OpenAI function tools — one tool per route — and runs a
// tool call as a real HTTP request.
//
// The spec is fetched from the selected server at runtime (GET /openapi.json), so the tool list is
// always exactly the routes that server has: a route added to the backend shows up here on the
// next reload, with no change to this app.
//
// No imports beyond types, on purpose: this file has no Vue or DOM dependency, so it can be
// exercised with plain Node.

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type Schema = Record<string, any>

export interface OpenApiSpec {
  info?: { title?: string; description?: string }
  paths?: Record<string, Record<string, any>>
  components?: { schemas?: Record<string, Schema> }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiTool {
  name: string
  method: HttpMethod
  path: string
  summary: string
  description: string
  parameters: Schema
  pathParams: string[]
  queryParams: { name: string; isArray: boolean }[]
  hasBody: boolean
  bodyRequired: boolean
  // Anything but GET changes data, and is what the approval setting guards.
  isWrite: boolean
}

export interface OpenAiTool {
  type: 'function'
  function: { name: string; description: string; parameters: Schema }
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const REF_PREFIX = '#/components/schemas/'

// OpenAI caps a function name at 64 characters of [a-zA-Z0-9_-]. Descriptions are capped too;
// the per-tool text is kept under that and the full reference goes in the system prompt instead.
const MAX_NAME = 64
const MAX_DESCRIPTION = 1024

// `format: double` is how tsoa says "a TypeScript number". It means nothing to JSON Schema, and
// every other format tsoa emits is the same kind of noise.
const KEPT_FORMATS = new Set(['date-time', 'date', 'time', 'email', 'uri', 'uuid'])

// Keywords that are OpenAPI-only, or documentation the model gets elsewhere.
const DROPPED_KEYWORDS = new Set([
  'example', 'examples', 'xml', 'externalDocs', 'discriminator', 'readOnly', 'writeOnly',
  'deprecated', 'title', 'nullable', 'format'
])

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim()

const clip = (text: string, max: number) =>
  text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'

// OpenAPI 3.0 schema → plain JSON Schema that OpenAI accepts. References are inlined (the
// function's parameters must stand alone), `nullable` becomes a `null` type, and an `example`
// moves into the description, where the model can see it.
export function toJsonSchema(schema: Schema | boolean | undefined, components: Record<string, Schema>, seen: string[] = []): Schema {
  if (schema === undefined || schema === true) return {}
  if (schema === false) return { not: {} }

  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.startsWith(REF_PREFIX) ? schema.$ref.slice(REF_PREFIX.length) : schema.$ref
    const { $ref, ...siblings } = schema
    if (seen.includes(name) || !components[name]) {
      // A cycle cannot be inlined, and a dangling reference has nothing to inline. Either way the
      // value is left open rather than failing the whole tool list.
      return { description: `A ${name} object.` }
    }
    return { ...toJsonSchema(components[name], components, [...seen, name]), ...toJsonSchema(siblings, components, seen) }
  }

  const out: Schema = {}
  for (const [key, value] of Object.entries(schema)) {
    if (DROPPED_KEYWORDS.has(key)) continue
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value).map(([name, property]) => [name, toJsonSchema(property as Schema, components, seen)])
      )
    } else if (key === 'items' || (key === 'additionalProperties' && typeof value === 'object')) {
      out[key] = toJsonSchema(value as Schema, components, seen)
    } else if ((key === 'allOf' || key === 'anyOf' || key === 'oneOf') && Array.isArray(value)) {
      out[key] = value.map((part) => toJsonSchema(part, components, seen))
    } else {
      out[key] = value
    }
  }

  if (typeof schema.format === 'string' && KEPT_FORMATS.has(schema.format)) out.format = schema.format
  if (schema.nullable && typeof out.type === 'string') out.type = [out.type, 'null']
  if (schema.example !== undefined) {
    const example = JSON.stringify(schema.example)
    const description = typeof out.description === 'string' ? oneLine(out.description) : ''
    if (!description.includes(example)) {
      out.description = description ? `${description} (e.g. ${example})` : `e.g. ${example}`
    }
  } else if (typeof out.description === 'string') {
    out.description = oneLine(out.description)
  }
  return out
}

const sanitizeName = (text: string) => text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')

const slugOfPath = (path: string) => sanitizeName(path.replace(/[{}]/g, ''))

function describe(method: HttpMethod, path: string, operation: Record<string, any>): string {
  const lines = [`${method} ${path}`]
  const text = [operation.summary, operation.description].filter(Boolean).map((part: string) => part.trim()).join('\n\n')
  if (text) lines.push(text)

  // The status codes and their messages: the model needs to know what a 403 or 409 from this route
  // means before it decides whether to retry or report.
  const responses = Object.entries(operation.responses || {})
    .map(([code, response]: [string, any]) => `${code} ${oneLine(response?.description || '')}`.trim())
  if (responses.length) lines.push(`Responses: ${responses.join('; ')}.`)

  return clip(lines.join('\n'), MAX_DESCRIPTION)
}

export function buildTools(spec: OpenApiSpec): ApiTool[] {
  const components = spec.components?.schemas || {}
  const operations: { method: HttpMethod; path: string; operation: Record<string, any> }[] = []
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [verb, operation] of Object.entries(item || {})) {
      const method = verb.toUpperCase() as HttpMethod
      if (METHODS.includes(method)) operations.push({ method, path, operation })
    }
  }

  // operationIds are not unique in this API (GetMe is both /users/me and /donors/me), and a tool
  // name must be. A unique id is used as it is; a repeated one gets its path appended.
  const idCounts = new Map<string, number>()
  for (const { operation } of operations) {
    const id = sanitizeName(operation.operationId || '')
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }

  const used = new Set<string>()
  const tools: ApiTool[] = []
  for (const { method, path, operation } of operations) {
    const id = sanitizeName(operation.operationId || '')
    let name = id && idCounts.get(id) === 1 ? id : sanitizeName(`${id || method}_${slugOfPath(path)}`)
    name = name.slice(0, MAX_NAME)
    for (let n = 2; used.has(name); n++) name = `${name.slice(0, MAX_NAME - String(n).length - 1)}_${n}`
    used.add(name)

    const properties: Record<string, Schema> = {}
    const required: string[] = []
    const pathParams: string[] = []
    const queryParams: { name: string; isArray: boolean }[] = []

    for (const parameter of operation.parameters || []) {
      if (!parameter || (parameter.in !== 'path' && parameter.in !== 'query')) continue
      const schema = toJsonSchema(parameter.schema, components)
      const notes = [parameter.description && oneLine(parameter.description), schema.description].filter(Boolean)
      properties[parameter.name] = {
        ...schema,
        ...(notes.length ? { description: [...new Set(notes)].join(' ') } : {})
      }
      if (parameter.required) required.push(parameter.name)
      if (parameter.in === 'path') pathParams.push(parameter.name)
      else queryParams.push({ name: parameter.name, isArray: schema.type === 'array' })
    }

    const bodySchema = operation.requestBody?.content?.['application/json']?.schema
    const hasBody = !!bodySchema
    const bodyRequired = hasBody && !!operation.requestBody.required
    if (hasBody) {
      const schema = toJsonSchema(bodySchema, components)
      properties.body = {
        ...schema,
        description: [operation.requestBody.description && oneLine(operation.requestBody.description), schema.description, 'The JSON request body.']
          .filter(Boolean).join(' ')
      }
      if (bodyRequired) required.push('body')
    }

    tools.push({
      name,
      method,
      path,
      summary: oneLine(operation.summary || operation.description || '').split(/(?<=\.)\s/)[0] || `${method} ${path}`,
      description: describe(method, path, operation),
      parameters: JSON.parse(JSON.stringify({ type: 'object', properties, required })),
      pathParams,
      queryParams,
      hasBody,
      bodyRequired,
      isWrite: method !== 'GET'
    })
  }
  return tools
}

export const toOpenAiTool = (tool: ApiTool): OpenAiTool => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: tool.parameters }
})

// ---------------------------------------------------------------------------------------------
// Running a tool call
// ---------------------------------------------------------------------------------------------

export interface ApiRequest {
  method: HttpMethod
  url: string
  body?: Json
}

export interface ApiResult {
  request: ApiRequest
  ok: boolean
  httpStatus: number
  durationMs: number
  contentType: string
  // Parsed JSON where the response was JSON, its text where it was text, and a one-line note where
  // it was binary (the certificate PDF): the model can do nothing with the bytes.
  body: Json
}

// Builds the request a tool call stands for. Throws, with a message meant for the model, when the
// arguments cannot make one.
export function buildRequest(baseUrl: string, tool: ApiTool, args: Record<string, any>): ApiRequest {
  let path = tool.path
  for (const name of tool.pathParams) {
    const value = args[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path parameter "${name}".`)
    }
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)))
  }

  // Query parameters go out in the same shape the Badhan frontend's axios sends them: arrays as
  // `name[]=a&name[]=b`, which Express parses into an array even when there is only one item.
  const query = new URLSearchParams()
  for (const { name, isArray } of tool.queryParams) {
    const value = args[name]
    if (value === undefined || value === null) continue
    if (isArray || Array.isArray(value)) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(`${name}[]`, String(item))
    } else if (typeof value === 'object') {
      query.append(name, JSON.stringify(value))
    } else {
      // An empty string is sent, not skipped: /search/v3 requires every parameter and takes ""
      // to mean "any".
      query.append(name, String(value))
    }
  }

  let body: Json | undefined
  if (tool.hasBody) {
    if (args.body !== undefined) {
      body = args.body
    } else {
      // Models sometimes flatten the body into the top-level arguments. Whatever is left once the
      // path and query parameters are taken out is that body.
      const known = new Set([...tool.pathParams, ...tool.queryParams.map((q) => q.name), 'body'])
      const rest = Object.fromEntries(Object.entries(args).filter(([key]) => !known.has(key)))
      if (Object.keys(rest).length || tool.bodyRequired) body = rest
    }
  }

  const search = query.toString()
  return { method: tool.method, url: `${baseUrl.replace(/\/+$/, '')}${path}${search ? `?${search}` : ''}`, body }
}

export async function sendRequest(request: ApiRequest, token: string, signal?: AbortSignal): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  // The Badhan API reads its session token from x-auth, not from an Authorization header.
  if (token) headers['x-auth'] = token
  if (request.body !== undefined) headers['Content-Type'] = 'application/json'

  const started = performance.now()
  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    signal
  })

  const contentType = response.headers.get('content-type') || ''
  let body: Json
  if (/json/i.test(contentType)) {
    const text = await response.text()
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  } else if (/^text\//i.test(contentType) || contentType === '') {
    body = await response.text()
  } else {
    const blob = await response.blob()
    body = `[binary response: ${contentType}, ${blob.size} bytes — not shown]`
  }

  return {
    request,
    ok: response.ok,
    httpStatus: response.status,
    durationMs: Math.round(performance.now() - started),
    contentType,
    body
  }
}
