import { Express, NextFunction, Request, Response, Router } from 'express'
import rateLimiter from '../middlewares/rateLimiter'
import { MCP_INSTRUCTIONS_MARKDOWN } from '../doc/apiVocabulary'
import { ApiResult, dispatchApiCall } from './dispatch'
import { handleMcpPayload, jsonRpcError, JSON_RPC, McpHttpResponse, McpServer, ToolCallResult } from './protocol'
import { findTool, listToolDefinitions, ToolDefinition, toToolResult } from './tools'
import { HTTP_STATUS } from '../constants'

// The MCP endpoint. Registered as plain express in app.ts and deliberately NOT a tsoa
// controller: /mcp speaks JSON-RPC, not the status/statusCode/message envelope every documented
// route speaks, and putting it in the OpenAPI spec would misdescribe both. It is invisible to
// /openapi.json on purpose.

const HTTP_METHOD_NOT_ALLOWED: number = 405

// Kept in step by hand with the version tsoa.json advertises for the API, which is what a client
// is really asking about when it reads serverInfo.
const MCP_SERVER_VERSION: string = '1.0.0'

// initialize and ping are answered without a token. This is not laxity: a client that cannot
// complete a handshake reports "server unreachable" rather than "not authorized", and the
// difference between those two is a support conversation. Nothing either one returns is private.
const METHODS_ALLOWED_WITHOUT_TOKEN: string[] = ['initialize', 'ping']

// Three carriers, first one found wins; a request carrying two is not an error worth inventing.
// The path form exists because claude.ai's web and mobile connectors and ChatGPT's connectors
// both take a URL and offer OAuth or nothing, with nowhere to type a header — see the plan's
// M3b for what that costs and why it is accepted.
const extractToken = (req: Request): string | undefined => {
  const xAuth: string | undefined = req.header('x-auth')
  if (xAuth) {
    return xAuth
  }
  const authorization: string | undefined = req.header('authorization')
  if (authorization && /^Bearer\s+\S/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim()
  }
  if (req.params.token) {
    return req.params.token
  }
  return undefined
}

// A notification carries no id and gets no answer, so it can never be the thing that needs a
// token; every request that is not initialize or ping does.
const needsToken = (message: any): boolean => {
  if (message === null || typeof message !== 'object' || Array.isArray(message) || !('id' in message)) {
    return false
  }
  return METHODS_ALLOWED_WITHOUT_TOKEN.indexOf(message.method) === -1
}

const payloadNeedsToken = (payload: any): boolean => {
  return Array.isArray(payload) ? payload.some(needsToken) : needsToken(payload)
}

// The Badhan half of the protocol layer. The token is closed over from the request, which is the
// reason this is built per request rather than once at mount time: a tool must never be able to
// name its own credential.
const buildServer = (app: Express, req: Request, token: string): McpServer => ({
  name: 'badhan',
  version: MCP_SERVER_VERSION,
  instructions: MCP_INSTRUCTIONS_MARKDOWN,
  listTools: listToolDefinitions,
  callTool: async (name: string, args: any): Promise<ToolCallResult> => {
    const tool: ToolDefinition = findTool(name)
    const result: ApiResult = await dispatchApiCall(app, req, token, tool.toCall(args))
    return toToolResult(result)
  }
})

const send = (res: Response, answer: McpHttpResponse): void => {
  if (answer.body === null) {
    // A notification-only payload. 202 with a zero-length body: answering a notification with a
    // response object makes a strict client drop the connection.
    res.status(answer.statusCode).end()
    return
  }
  res.status(answer.statusCode).json(answer.body)
}

type PostHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

const handlePost = (app: Express): PostHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token: string | undefined = extractToken(req)
      if (!token && payloadNeedsToken(req.body)) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(jsonRpcError(
          null,
          JSON_RPC.INVALID_REQUEST,
          'No Badhan token. Send it as an x-auth header, an Authorization: Bearer header, or as the last path segment: POST /mcp/<token>.'
        ))
        return
      }
      // This endpoint does not authenticate. The token is carried into the dispatched request
      // and checked there, once, by the middleware that already owns that job — a second check
      // here would be a second place for the rules to drift. So a token that is present but
      // junk reaches the API and comes back as a tool result carrying its 401, which is what
      // lets the model read the reason and stop rather than the client swallowing it.
      send(res, await handleMcpPayload(buildServer(app, req, token || ''), req.body))
    } catch (error) {
      next(error)
    }
  }
}

// GET and DELETE are the session half of streamable HTTP — the SSE stream and the session
// teardown. This server is stateless and has neither. The message says so: a client author who
// meets a bare 405 will assume a routing mistake and go looking for one.
const methodNotAllowed = (req: Request, res: Response): void => {
  res.status(HTTP_METHOD_NOT_ALLOWED).json(jsonRpcError(
    null,
    JSON_RPC.INVALID_REQUEST,
    `${req.method} is not supported. This MCP server is stateless: there is no event stream and no session to end, so every exchange is a single POST.`
  ))
}

export const mcpRouter = (app: Express): Router => {
  const router: Router = Router()
  const post: PostHandler = handlePost(app)

  router.use(rateLimiter.mcpLimiter)
  router.post('/', post)
  // A JWT is base64url and dots, so it needs no encoding to sit in a path segment.
  router.post('/:token', post)
  router.all('/', methodNotAllowed)
  router.all('/:token', methodNotAllowed)

  return router
}
