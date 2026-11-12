import fs from 'fs'
import path from 'path'
import { URLSearchParams } from 'url'

// Badhan Agent's tools: one OpenAI function per API route, built from this backend's own OpenAPI
// spec, and the HTTP request a tool call stands for.
//
// Ported from the browser (badhan-frontend/src/views/Agent.vue), which built the same list from
// a fetched /openapi.json. Here it reads the very file /openapi.json serves, once per process. A
// route added to the backend therefore becomes a tool on the next deploy with no change here —
// except the ones this file leaves out on purpose (SESSION_ROUTES and every /agent route).
//
// The backend only BUILDS each request. The browser sends it, with the member's own session
// token, so every call is made as the member and within their permissions.

const METHODS: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const REF_PREFIX: string = '#/components/schemas/'

// OpenAI caps a function name at 64 characters of [a-zA-Z0-9_-]. Descriptions are capped too;
// the per-tool text is kept under that, and the value codes go in the system prompt instead.
const MAX_NAME: number = 64
const MAX_DESCRIPTION: number = 1024

// `format: double` is how tsoa says "a TypeScript number". It means nothing to JSON Schema, and
// every other format tsoa emits is the same kind of noise.
const KEPT_FORMATS: Set<string> = new Set(['date-time', 'date', 'time', 'email', 'uri', 'uuid'])

// Keywords that are OpenAPI-only, or documentation the model gets elsewhere.
const DROPPED_KEYWORDS: Set<string> = new Set([
  'example', 'examples', 'xml', 'externalDocs', 'discriminator', 'readOnly', 'writeOnly',
  'deprecated', 'title', 'nullable', 'format'
])

// Routes that act on the session the agent borrows rather than on records, left out so the model
// cannot call them at all. A sign-out would end the member's own app session; a sign-in or a
// password change would put a password through the chat, and so through OpenAI; and a redirection
// token is a second, long-lived session nobody asked for.
export const SESSION_ROUTES: Set<string> = new Set([
  'POST /users/signin',
  'DELETE /users/signout',
  'DELETE /users/signout/all',
  'POST /users/redirection',
  'PATCH /users/password'
])

// The agent's own routes are left out as well. Through them the model could read and delete the
// member's chats, drive its own steps, and — for a super admin — read every member's transcripts.
export const isAgentRoute = (routePath: string): boolean => routePath === '/agent' || routePath.startsWith('/agent/')

export interface IAgentTool {
  name: string
  method: string
  // The route's path template, e.g. /activeDonors/{donorId}
  path: string
  // What a tool card shows instead of a URL: the route's summary, or the first line of its
  // description, or as a last resort its operation id in words.
  label: string
  description: string
  parameters: any
  pathParams: string[]
  queryParams: { name: string, isArray: boolean }[]
  hasBody: boolean
  bodyRequired: boolean
  // Anything but GET changes data, and waits for the member to press Approve.
  isWrite: boolean
}

export interface IAgentRequest {
  method: string
  // The path with its parameters filled in and its query string, e.g. /search/v3?hall=5. The
  // browser puts its own API base URL in front.
  path: string
  body?: any
}

const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim()

const clipDescription = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…'

// OpenAPI 3.0 schema → plain JSON Schema that OpenAI accepts. References are inlined (the
// function's parameters must stand alone), `nullable` becomes a `null` type, and an `example`
// moves into the description, where the model can see it.
const toJsonSchema = (schema: any, components: Record<string, any>, seen: string[] = []): any => {
  if (schema === undefined || schema === true) return {}
  if (schema === false) return { not: {} }

  if (typeof schema.$ref === 'string') {
    const name: string = schema.$ref.startsWith(REF_PREFIX) ? schema.$ref.slice(REF_PREFIX.length) : schema.$ref
    const siblings: any = { ...schema }
    delete siblings.$ref
    if (seen.includes(name) || !components[name]) {
      // A cycle cannot be inlined, and a dangling reference has nothing to inline. Either way the
      // value is left open rather than failing the whole tool list.
      return { description: `A ${name} object.` }
    }
    return { ...toJsonSchema(components[name], components, [...seen, name]), ...toJsonSchema(siblings, components, seen) }
  }

  const out: any = {}
  for (const [key, value] of Object.entries(schema)) {
    if (DROPPED_KEYWORDS.has(key)) continue
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, any>).map(([name, property]: [string, any]): [string, any] =>
          [name, toJsonSchema(property, components, seen)])
      )
    } else if (key === 'items' || (key === 'additionalProperties' && typeof value === 'object')) {
      out[key] = toJsonSchema(value, components, seen)
    } else if ((key === 'allOf' || key === 'anyOf' || key === 'oneOf') && Array.isArray(value)) {
      out[key] = value.map((part: any): any => toJsonSchema(part, components, seen))
    } else {
      out[key] = value
    }
  }

  if (typeof schema.format === 'string' && KEPT_FORMATS.has(schema.format)) out.format = schema.format
  if (schema.nullable && typeof out.type === 'string') out.type = [out.type, 'null']
  if (schema.example !== undefined) {
    const example: string = JSON.stringify(schema.example)
    const description: string = typeof out.description === 'string' ? oneLine(out.description) : ''
    if (!description.includes(example)) {
      out.description = description ? `${description} (e.g. ${example})` : `e.g. ${example}`
    }
  } else if (typeof out.description === 'string') {
    out.description = oneLine(out.description)
  }
  return out
}

const sanitizeName = (text: string): string => text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')

const slugOfPath = (routePath: string): string => sanitizeName(routePath.replace(/[{}]/g, ''))

const describe = (method: string, routePath: string, operation: any): string => {
  const lines: string[] = [`${method} ${routePath}`]
  const text: string = [operation.summary, operation.description]
    .filter(Boolean).map((part: string): string => part.trim()).join('\n\n')
  if (text) lines.push(text)

  // The status codes and their messages: the model needs to know what a 403 or 409 from this route
  // means before it decides whether to retry or report.
  const responses: string[] = Object.entries(operation.responses || {})
    .map(([code, response]: [string, any]): string => `${code} ${oneLine((response && response.description) || '')}`.trim())
  if (responses.length) lines.push(`Responses: ${responses.join('; ')}.`)

  return clipDescription(lines.join('\n'), MAX_DESCRIPTION)
}

// "GetDonorsNew" → "Get donors new". Only reached by a route with neither a summary nor a
// description, which the agent's label test forbids; it exists so a card never shows a URL.
const wordsOf = (operationId: string): string => {
  const words: string = operationId.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'An API request'
}

const labelOf = (operation: any): string => {
  const summary: string = (operation.summary || '').trim()
  if (summary) return summary
  const firstLine: string = (operation.description || '').trim().split('\n')[0].trim()
  if (firstLine) return firstLine
  return wordsOf(operation.operationId || '')
}

export const buildTools = (spec: any): IAgentTool[] => {
  const components: Record<string, any> = (spec.components && spec.components.schemas) || {}
  const operations: { method: string, path: string, operation: any }[] = []
  for (const [routePath, item] of Object.entries(spec.paths || {}) as [string, any][]) {
    for (const [verb, operation] of Object.entries(item || {}) as [string, any][]) {
      const method: string = verb.toUpperCase()
      if (METHODS.includes(method) && !SESSION_ROUTES.has(`${method} ${routePath}`) && !isAgentRoute(routePath)) {
        operations.push({ method, path: routePath, operation })
      }
    }
  }

  // operationIds are not unique in this API (GetMe is both /users/me and /donors/me), and a tool
  // name must be. A unique id is used as it is; a repeated one gets its path appended.
  const idCounts: Map<string, number> = new Map()
  for (const { operation } of operations) {
    const id: string = sanitizeName(operation.operationId || '')
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }

  const used: Set<string> = new Set()
  const tools: IAgentTool[] = []
  for (const { method, path: routePath, operation } of operations) {
    const id: string = sanitizeName(operation.operationId || '')
    let name: string = id && idCounts.get(id) === 1 ? id : sanitizeName(`${id || method}_${slugOfPath(routePath)}`)
    name = name.slice(0, MAX_NAME)
    for (let n: number = 2; used.has(name); n++) name = `${name.slice(0, MAX_NAME - String(n).length - 1)}_${n}`
    used.add(name)

    const properties: Record<string, any> = {}
    const required: string[] = []
    const pathParams: string[] = []
    const queryParams: { name: string, isArray: boolean }[] = []

    for (const parameter of operation.parameters || []) {
      if (!parameter || (parameter.in !== 'path' && parameter.in !== 'query')) continue
      const schema: any = toJsonSchema(parameter.schema, components)
      const notes: string[] = [parameter.description && oneLine(parameter.description), schema.description].filter(Boolean)
      properties[parameter.name] = {
        ...schema,
        ...(notes.length ? { description: [...new Set(notes)].join(' ') } : {})
      }
      if (parameter.required) required.push(parameter.name)
      if (parameter.in === 'path') pathParams.push(parameter.name)
      else queryParams.push({ name: parameter.name, isArray: schema.type === 'array' })
    }

    const requestBody: any = operation.requestBody
    const bodySchema: any = requestBody && requestBody.content && requestBody.content['application/json'] &&
      requestBody.content['application/json'].schema
    const hasBody: boolean = !!bodySchema
    const bodyRequired: boolean = hasBody && !!requestBody.required
    if (hasBody) {
      const schema: any = toJsonSchema(bodySchema, components)
      properties.body = {
        ...schema,
        description: [requestBody.description && oneLine(requestBody.description), schema.description, 'The JSON request body.']
          .filter(Boolean).join(' ')
      }
      if (bodyRequired) required.push('body')
    }

    tools.push({
      name,
      method,
      path: routePath,
      label: labelOf(operation),
      description: describe(method, routePath, operation),
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

export const toOpenAiTool = (tool: IAgentTool): any => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: tool.parameters }
})

// The spec /openapi.json serves (see app.ts), written by `npm run tsoa:spec` beside the compiled
// code: dist/tsoa/swagger.json, two levels up from dist/services/agent/.
const SPEC_PATH: string = path.join(__dirname, '..', '..', 'tsoa', 'swagger.json')

let cachedTools: IAgentTool[] | null = null

// Read once, the first time a request needs it, and kept for the life of the process. The spec
// only changes with a deploy, and a deploy is a new process.
export const getTools = (): IAgentTool[] => {
  if (!cachedTools) {
    cachedTools = buildTools(JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8')))
  }
  return cachedTools
}

export const findTool = (name: string): IAgentTool | undefined =>
  getTools().find((tool: IAgentTool): boolean => tool.name === name)

// Builds the request a tool call stands for. Throws, with a message meant for the model, when the
// arguments cannot make one.
export const buildRequest = (tool: IAgentTool, args: Record<string, any>): IAgentRequest => {
  let requestPath: string = tool.path
  for (const name of tool.pathParams) {
    const value: any = args[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path parameter "${name}".`)
    }
    requestPath = requestPath.replace(`{${name}}`, encodeURIComponent(String(value)))
  }

  // Query parameters go out in the same shape badhanAxios sends them: arrays as
  // `name[]=a&name[]=b`, which Express parses into an array even when there is only one item.
  const query: URLSearchParams = new URLSearchParams()
  for (const { name, isArray } of tool.queryParams) {
    const value: any = args[name]
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

  let body: any
  if (tool.hasBody) {
    if (args.body !== undefined) {
      body = args.body
    } else {
      // Models sometimes flatten the body into the top-level arguments. Whatever is left once the
      // path and query parameters are taken out is that body.
      const known: Set<string> = new Set([...tool.pathParams, ...tool.queryParams.map((q: { name: string }): string => q.name), 'body'])
      const rest: Record<string, any> = Object.fromEntries(Object.entries(args).filter(([key]: [string, any]): boolean => !known.has(key)))
      if (Object.keys(rest).length || tool.bodyRequired) body = rest
    }
  }

  const search: string = query.toString()
  return { method: tool.method, path: `${requestPath}${search ? `?${search}` : ''}`, ...(body === undefined ? {} : { body }) }
}
