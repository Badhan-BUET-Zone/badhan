// The MCP protocol layer: JSON-RPC framing and the Model Context Protocol handshake, and
// nothing about Badhan. Everything domain-specific arrives through the McpServer hooks below,
// so this file can be read (and tested) as a protocol implementation on its own.
//
// Written by hand rather than taken from @modelcontextprotocol/sdk on purpose: the SDK is
// ESM-first with an `exports` subpath map that this project's node10 module resolution cannot
// follow, and adopting it means bumping TypeScript and switching moduleResolution across a
// codebase whose tsoa decorators and generated routes all compile under the current settings.
// Stateless streamable HTTP is a small protocol, and this is all of it. If this file starts
// growing to track spec revisions, that is the moment to take the SDK instead.

// The version this server speaks. MCP_SUPPORTED_VERSIONS is what it will accept from a client;
// negotiation echoes a supported request and otherwise falls back to this one (see below).
export const MCP_PROTOCOL_VERSION: string = '2025-06-18'
export const MCP_SUPPORTED_VERSIONS: string[] = ['2025-06-18', '2025-03-26']

// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to number)
export const JSON_RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const

export interface JsonRpcError { code: number, message: string, data?: any }
export interface JsonRpcRequest { jsonrpc: '2.0', id?: string | number | null, method: string, params?: any }
export interface JsonRpcResponse { jsonrpc: '2.0', id: string | number | null, result?: any, error?: JsonRpcError }

export interface ToolContent { type: 'text', text: string }

// A tool that ran and failed is a *result* with isError, never a JSON-RPC error: an error means
// the call could not be dispatched at all, and a client handles those itself rather than showing
// them to the model. A 403 from the API is something the model has to see and adjust to.
export interface ToolCallResult { content: ToolContent[], isError: boolean }

// The Badhan-shaped half of the server, supplied by the caller.
export interface McpServer {
  name: string
  version: string
  // Returned from `initialize` as `instructions`: the vocabulary a model needs before its first call.
  instructions: string
  // Tool definitions as `tools/list` transmits them — already JSON, already schema-shaped.
  listTools: () => object[]
  callTool: (name: string, args: any) => Promise<ToolCallResult>
}

// What the endpoint should send back. `body` is null for a notification-only payload, which is
// answered with 202 and a zero-length body — a strict client drops the connection if a
// notification is answered with a response object.
export interface McpHttpResponse { statusCode: number, body: JsonRpcResponse | JsonRpcResponse[] | null }

const HTTP_OK: number = 200
const HTTP_ACCEPTED: number = 202

// Thrown when the call itself is undispatchable — an unknown tool name, or arguments that are
// not shaped like arguments. It carries the JSON-RPC code to answer with; anything else thrown
// out of a hook becomes INTERNAL_ERROR.
export class McpDispatchError extends Error {
  public readonly code: number

  constructor (message: string, code: number) {
    super(message)
    this.code = code
  }
}

export const jsonRpcError = (id: string | number | null, code: number, message: string, data?: any): JsonRpcResponse => {
  const error: JsonRpcError = { code, message }
  if (data !== undefined) {
    error.data = data
  }
  return { jsonrpc: '2.0', id, error }
}

const jsonRpcResult = (id: string | number | null, result: any): JsonRpcResponse => {
  return { jsonrpc: '2.0', id, result }
}

const isObject = (message: any): boolean => {
  return message !== null && typeof message === 'object' && !Array.isArray(message)
}

// A message with no `id` is a notification and gets no response at all. `id: null` is a legal
// request id in the MCP dialect, so the test is presence of the key, not truthiness of the value.
const isNotification = (message: any): boolean => {
  return !('id' in message)
}

const isWellFormed = (message: any): boolean => {
  return message.jsonrpc === '2.0' && typeof message.method === 'string'
}

// Negotiation echoes, it does not assert. A client asking for a version we speak gets that
// version back; anyone else gets ours and decides for themselves whether to continue. Answering
// with a 400 turns a version skew into "server unreachable", which is a support conversation.
const negotiateProtocolVersion = (requested: any): string => {
  if (typeof requested === 'string' && MCP_SUPPORTED_VERSIONS.indexOf(requested) !== -1) {
    return requested
  }
  return MCP_PROTOCOL_VERSION
}

const handleInitialize = (server: McpServer, params: any): any => {
  return {
    protocolVersion: negotiateProtocolVersion(params ? params.protocolVersion : undefined),
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: server.name, version: server.version },
    instructions: server.instructions
  }
}

const handleToolsCall = async (server: McpServer, params: any): Promise<ToolCallResult> => {
  if (params === null || typeof params !== 'object' || typeof params.name !== 'string') {
    throw new McpDispatchError('tools/call requires a "name"', JSON_RPC.INVALID_PARAMS)
  }
  const args: any = params.arguments === undefined ? {} : params.arguments
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new McpDispatchError('"arguments" must be an object', JSON_RPC.INVALID_PARAMS)
  }
  return server.callTool(params.name, args)
}

// One request in, one response out. Notifications never reach here.
const handleRequest = async (server: McpServer, request: JsonRpcRequest): Promise<JsonRpcResponse> => {
  const id: string | number | null = request.id === undefined ? null : request.id
  try {
    switch (request.method) {
      case 'initialize':
        return jsonRpcResult(id, handleInitialize(server, request.params))
      case 'tools/list':
        // No pagination: the tool table fits in one page, and a nextCursor nobody sets is a lie.
        return jsonRpcResult(id, { tools: server.listTools() })
      case 'tools/call':
        return jsonRpcResult(id, await handleToolsCall(server, request.params))
      case 'ping':
        return jsonRpcResult(id, {})
      default:
        return jsonRpcError(id, JSON_RPC.METHOD_NOT_FOUND, `Unknown method: ${request.method}`)
    }
  } catch (error) {
    if (error instanceof McpDispatchError) {
      return jsonRpcError(id, error.code, error.message)
    }
    return jsonRpcError(id, JSON_RPC.INTERNAL_ERROR, error instanceof Error ? error.message : 'Internal error')
  }
}

// A single message: either a response to send, or null when it was a notification.
const handleMessage = async (server: McpServer, message: any): Promise<JsonRpcResponse | null> => {
  if (!isObject(message)) {
    return jsonRpcError(null, JSON_RPC.INVALID_REQUEST, 'Not a valid JSON-RPC 2.0 request')
  }
  if (isNotification(message)) {
    // Notifications — `notifications/initialized` above all — are accepted and dropped. An
    // unrecognised or malformed one is not an error either; the sender is not waiting for an answer.
    return null
  }
  if (!isWellFormed(message)) {
    const id: string | number | null = message.id === undefined ? null : message.id
    return jsonRpcError(id, JSON_RPC.INVALID_REQUEST, 'Not a valid JSON-RPC 2.0 request')
  }
  return handleRequest(server, message as JsonRpcRequest)
}

// The whole endpoint body, batch or not. The caller has already parsed the JSON (express does
// it) and supplies whatever came out; a body that failed to parse is the router's PARSE_ERROR.
export const handleMcpPayload = async (server: McpServer, payload: any): Promise<McpHttpResponse> => {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { statusCode: HTTP_OK, body: jsonRpcError(null, JSON_RPC.INVALID_REQUEST, 'Empty batch') }
    }
    const answers: (JsonRpcResponse | null)[] = []
    // Sequentially, not Promise.all: a batch of tool calls is a batch of writes through the real
    // express stack, and the client sent them in an order.
    for (const message of payload) {
      answers.push(await handleMessage(server, message))
    }
    const responses: JsonRpcResponse[] = answers.filter((answer: JsonRpcResponse | null): boolean => answer !== null) as JsonRpcResponse[]
    if (responses.length === 0) {
      return { statusCode: HTTP_ACCEPTED, body: null }
    }
    return { statusCode: HTTP_OK, body: responses }
  }

  const response: JsonRpcResponse | null = await handleMessage(server, payload)
  if (response === null) {
    return { statusCode: HTTP_ACCEPTED, body: null }
  }
  return { statusCode: HTTP_OK, body: response }
}
