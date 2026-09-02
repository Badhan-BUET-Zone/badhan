import { Express, Request } from 'express'
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'
import { HTTP_STATUS } from '../constants'

// Replays a tool call as a real request through the app's own express stack.
//
// Why not call the controller methods directly: the permission rules are not in a service
// layer. DonationsController.postDonation loads the target donor, applies the hall rule and
// writes the audit log inside the controller method, reading its inputs off
// res.locals.middlewareResponse — which the authentication middleware put there. Calling the
// method needs a fabricated request anyway, and one that skips the validators would accept
// bodies the API rejects.
//
// Why not an HTTP loopback to 127.0.0.1: it would work, and it would silently break rate
// limiting. express-rate-limit keys on req.ip, and every loopback request has the same one, so
// all MCP traffic from every member on the planet would share one 12-per-minute bucket. The
// first symptom would be volunteers getting 429s from a server that is not busy.
//
// This file therefore exists to carry the caller's own IP into the replayed request, and that
// is the one thing it must get right.
//
// It leans on two things express does but does not document: app.handle's init middleware sets
// the request/response prototypes and res.locals, and express.json() reads the body off a
// stream we push into. Both are stable; neither is API. A major express upgrade must re-run
// this file's tests before anything else is believed.

export type QueryValue = string | number | boolean

export interface ApiCall {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  // An array value is repeated as `key=a&key=b`, which is what express's query parser reads back
  // as an array. GET /donors/phone's phoneList is the only parameter that needs it.
  query?: Record<string, QueryValue | QueryValue[]>
  body?: unknown
}

export interface ApiResult { statusCode: number, body: any }

// app.handle is express's own per-request entry point — what an http.Server hands each request
// to. @types/express does not declare it, so it is named here rather than reached for with a
// bare cast at the call site.
interface ExpressWithHandle {
  handle: (req: IncomingMessage, res: ServerResponse, out: (error?: any) => void) => void
}

const buildUrl = (call: ApiCall): string => {
  if (!call.query) {
    return call.path
  }
  const search: URLSearchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(call.query)) {
    if (value === undefined || value === null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }
  const query: string = search.toString()
  return query.length === 0 ? call.path : `${call.path}?${query}`
}

const buildHeaders = (origin: Request, token: string, payload: string): IncomingHttpHeaders => {
  const headers: IncomingHttpHeaders = {
    // Read by middleware and by every absolute-URL construction.
    host: origin.headers.host,
    // The token comes from the MCP request, never from the tool's own input: a tool that could
    // name its own credential is a tool that can borrow somebody else's.
    'x-auth': token,
    // Without both of these express.json() skips the body entirely and every write tool sees {}.
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(payload)),
    // The audit log and the device list both record a user agent. Without this line every MCP
    // action would be logged as whatever browser minted the token, and "which of these rows was
    // an assistant" would be unanswerable.
    'user-agent': `Badhan-MCP/1 (${origin.headers['user-agent'] || 'unknown client'})`
  }
  // userAgentHandler reads the audit log's ipAddress off x-forwarded-for before it falls back to
  // the socket, and on App Engine that header is the only place the member's real address
  // appears. Forwarding it keeps the replayed request's logged IP identical to the MCP
  // request's, which is the whole point of the socket below.
  const forwardedFor: string | undefined = origin.headers['x-forwarded-for'] as string | undefined
  if (forwardedFor) {
    headers['x-forwarded-for'] = forwardedFor
  }
  return headers
}

// A bare socket carrying the originating request's address. remoteAddress is a getter on
// net.Socket, hence defineProperty rather than assignment; req.ip reads through to it, and so
// does every rate limiter keyed on req.ip.
const buildSocket = (origin: Request): Socket => {
  const socket: Socket = new Socket()
  Object.defineProperty(socket, 'remoteAddress', { value: origin.ip })
  return socket
}

const parseBody = (raw: string): any => {
  if (raw.length === 0) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    // A non-JSON response body (there should be none on the routes the tools cover) is handed
    // back as the string it is rather than being turned into a dispatch failure.
    return raw
  }
}

export const dispatchApiCall = (app: Express, origin: Request, token: string, call: ApiCall): Promise<ApiResult> => {
  return new Promise<ApiResult>((resolve: (result: ApiResult) => void): void => {
    const payload: string = call.body === undefined ? '' : JSON.stringify(call.body)

    const req: IncomingMessage = new IncomingMessage(buildSocket(origin))
    req.method = call.method
    req.url = buildUrl(call)
    req.headers = buildHeaders(origin, token, payload)

    const res: ServerResponse = new ServerResponse(req)

    const chunks: Buffer[] = []
    let settled: boolean = false

    const collect = (chunk: any): void => {
      if (chunk !== undefined && chunk !== null && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      }
    }

    const settle = (): void => {
      if (settled) {
        return
      }
      settled = true
      resolve({ statusCode: res.statusCode, body: parseBody(Buffer.concat(chunks).toString('utf8')) })
    }

    // write and end are replaced outright rather than wrapped, so ServerResponse never tries to
    // flush a header block down a socket that is not connected to anything.
    ;(res as any).write = (chunk: any, ...rest: any[]): boolean => {
      collect(chunk)
      const callback: any = rest[rest.length - 1]
      if (typeof callback === 'function') {
        callback()
      }
      return true
    }
    ;(res as any).end = (chunk: any, ...rest: any[]): ServerResponse => {
      collect(chunk)
      const callback: any = rest[rest.length - 1]
      if (typeof callback === 'function') {
        callback()
      }
      settle()
      return res
    }

    // Nothing should reach this: app.use('*', routeNotFoundHandler) answers unmatched paths and
    // internalServerErrorHandler answers thrown errors. It is here so a future change to either
    // shows up as a 500 with a message rather than as a promise that never settles.
    const out = (error?: any): void => {
      if (settled) {
        return
      }
      settled = true
      resolve({
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: error instanceof Error ? error.message : 'Request fell through the express stack' }
      })
    }

    (app as unknown as ExpressWithHandle).handle(req, res, out)

    // Supplied after app.handle so the stream is already being read: express.json() attaches its
    // listeners synchronously, and a Readable holds what is pushed either way.
    if (payload.length > 0) {
      req.push(payload)
    }
    req.push(null)
  })
}
