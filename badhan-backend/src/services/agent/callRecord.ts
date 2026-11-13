import crypto from 'crypto'
import { toApiMessages } from './conversation'
import { ICallFailure, ICallTrace, IRequestSettings, requestBodyOf } from './openai'
import { joinSystemPrompt } from './prompt'

// The record of each model call, kept so a super admin's download shows exactly what was sent to
// OpenAI and what came back — and kept so that NOTHING IS STORED TWICE INSIDE A CHAT.
//
// WHERE EACH PIECE LIVES
//
//   chat.requestParts      { '<kind>_<hash>': value }. What every call sends but rarely changes,
//                          each version once: the system prompt's fixed part, the tools list,
//                          the request settings (model, reasoning effort).
//   message.modelCall      on the assistant message a call wrote, or on the `error` message for a
//                          call that failed:
//                            parts         the keys of the three versions it used
//                            sessionNote   the end of the system prompt: server, member, time.
//                                          It differs on every call, so it is this call's own.
//                            requestId     OpenAI's x-request-id header (null with no answer)
//                            durationMs
//                            response      assistant only: OpenAI's whole answer MINUS what the
//                                          message already holds (see trimResponse)
//                            responseOmits which of those were taken out
//                            error         error only: { kind, httpStatus, body }
//
// WHAT IS NOT STORED
//
//   The messages array of each request. It is the chat itself, sent again on every call, so
//   keeping it would store the conversation once per call. It is rebuilt for the download from the
//   stored messages by the same toApiMessages the call used: a call's history is every message
//   before it, and none of those changes after the call (a tool result is written once, and the
//   pending ones are closed before the call).

export type RequestPartKind = 'systemPrompt' | 'tools' | 'settings'

export interface IRequestPartKeys {
  systemPrompt: string
  tools: string
  settings: string
}

// A part's key: its kind, then 16 hex characters of a SHA-256 of its content. Within one chat the
// handful of versions it ever holds cannot collide. The kind in front also keeps a key from being
// all digits, which a dotted update path would read as an array index.
const partKey = (kind: RequestPartKind, value: any): string =>
  `${kind}_${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)}`

export const requestPartsOf = (
  { systemPrompt, tools, settings }: { systemPrompt: string, tools: any[], settings: IRequestSettings }
): { keys: IRequestPartKeys, parts: Record<string, any> } => {
  const keys: IRequestPartKeys = {
    systemPrompt: partKey('systemPrompt', systemPrompt),
    tools: partKey('tools', tools),
    settings: partKey('settings', settings)
  }
  return {
    keys,
    parts: { [keys.systemPrompt]: systemPrompt, [keys.tools]: tools, [keys.settings]: settings }
  }
}

// What the assistant message already holds of OpenAI's answer, and so is taken out of the copy
// kept in modelCall.response:
//   model      as openaiModel
//   usage      as usage
//   content    as content — only when there is no refusal, since content is stored with the
//              refusal appended and could not be split back
//   toolCalls  as toolCalls — only when there are some, since an empty list is not stored
type ResponseOmission = 'model' | 'usage' | 'content' | 'toolCalls'

const trimResponse = (raw: any): { response: any, responseOmits: ResponseOmission[] } => {
  const response: any = { ...raw }
  const responseOmits: ResponseOmission[] = []
  if (typeof raw.model === 'string') {
    delete response.model
    responseOmits.push('model')
  }
  if (raw.usage) {
    delete response.usage
    responseOmits.push('usage')
  }
  const [choice, ...otherChoices]: any[] = raw.choices
  const message: any = { ...choice.message }
  if (typeof message.content === 'string' && !message.refusal) {
    delete message.content
    responseOmits.push('content')
  }
  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    delete message.tool_calls
    responseOmits.push('toolCalls')
  }
  response.choices = [{ ...choice, message }, ...otherChoices]
  return { response, responseOmits }
}

// The reverse, for the download: OpenAI's answer whole again. Key order inside it may differ from
// what OpenAI sent; nothing else does.
const restoreResponse = (stored: any): any | null => {
  const call: any = stored.modelCall
  if (!call || !call.response) return null
  const omits: Set<string> = new Set(call.responseOmits || [])
  const response: any = { ...call.response }
  if (omits.has('model')) response.model = stored.openaiModel
  if (omits.has('usage')) response.usage = stored.usage
  if ((omits.has('content') || omits.has('toolCalls')) && Array.isArray(response.choices) && response.choices.length) {
    const [choice, ...otherChoices]: any[] = response.choices
    const message: any = { ...choice.message }
    if (omits.has('content')) message.content = stored.content
    if (omits.has('toolCalls')) message.tool_calls = stored.toolCalls
    response.choices = [{ ...choice, message }, ...otherChoices]
  }
  return response
}

export const answeredCallRecord = (keys: IRequestPartKeys, sessionNote: string, trace: ICallTrace, raw: any): Record<string, any> => ({
  parts: keys,
  sessionNote,
  requestId: trace.requestId,
  durationMs: trace.durationMs,
  ...trimResponse(raw)
})

export const failedCallRecord = (keys: IRequestPartKeys, sessionNote: string, failure: ICallFailure): Record<string, any> => ({
  parts: keys,
  sessionNote,
  requestId: failure.requestId,
  durationMs: failure.durationMs,
  error: { kind: failure.kind, httpStatus: failure.httpStatus, body: failure.body }
})

// ─── The download ──────────────────────────────────────────────────────────────────────────

export interface IExportedModelCall {
  seq: number
  outcome: 'answered' | 'failed'
  requestId: string | null
  durationMs: number | null
  // The request body with `messages: null`; null when a part it needs is missing.
  request: Record<string, any> | null
  // The first entry of the request's messages.
  systemMessage: any | null
  // The rest of them: the first `conversationLength` entries of the export's `conversation`, or,
  // in the one case that is not true, the whole list in `messages`. Exactly one is non-null.
  conversationLength: number | null
  messages: any[] | null
  response: any | null
  error: any | null
  // Keys in modelCall.parts that the chat's requestParts does not have. Absent when none are.
  missingParts?: string[]
}

// Two entries toApiMessages built from the same stored messages: equal when every field is the
// very same value, which it is when both were built from the same message.
const sameEntry = (a: any, b: any): boolean => {
  if (!b) return false
  const keys: string[] = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key: string): boolean => a[key] === b[key])
}

/**
 * Every recorded model call of a chat, rebuilt, plus the chat as OpenAI is sent it.
 *
 * The response stays linear in the size of the chat however many calls it has: each call's
 * messages are given as a length into `conversation`, which the page expands into a full request
 * for the file. Calls made before calls were recorded have no modelCall and are not listed.
 */
export const exportModelCalls = (chat: any, messages: any[]): { conversation: any[], modelCalls: IExportedModelCall[] } => {
  const recorded: any[] = messages.filter((message: any): boolean => !!message.modelCall)
  if (!recorded.length) return { conversation: [], modelCalls: [] }

  const history: any[] = messages.filter((message: any): boolean => message.role !== 'error')
  const conversation: any[] = toApiMessages(history, '').slice(1)
  const parts: Record<string, any> = chat.requestParts || {}

  const modelCalls: IExportedModelCall[] = recorded.map((stored: any): IExportedModelCall => {
    const call: any = stored.modelCall
    const keys: Partial<IRequestPartKeys> = call.parts || {}
    const part = (key: string | undefined): any => (key && Object.prototype.hasOwnProperty.call(parts, key) ? parts[key] : undefined)
    const fixedPrompt: string | undefined = part(keys.systemPrompt)
    const tools: any[] | undefined = part(keys.tools)
    const settings: IRequestSettings | undefined = part(keys.settings)
    const missingParts: string[] = [keys.systemPrompt, keys.tools, keys.settings]
      .filter((key: string | undefined): boolean => part(key) === undefined)
      .map((key: string | undefined): string => key || '(no key)')

    const sent: any[] = toApiMessages(
      history.filter((message: any): boolean => message.seq < stored.seq),
      fixedPrompt === undefined ? '' : joinSystemPrompt(fixedPrompt, call.sessionNote || '')
    )
    const rest: any[] = sent.slice(1)
    const isPrefix: boolean = rest.every((entry: any, index: number): boolean => sameEntry(entry, conversation[index]))

    return {
      seq: stored.seq,
      outcome: stored.role === 'error' ? 'failed' : 'answered',
      requestId: call.requestId ?? null,
      durationMs: call.durationMs ?? null,
      request: settings && tools ? requestBodyOf(settings, null, tools) : null,
      systemMessage: fixedPrompt === undefined ? null : sent[0],
      conversationLength: isPrefix ? rest.length : null,
      messages: isPrefix ? null : rest,
      response: restoreResponse(stored),
      error: call.error || null,
      ...(missingParts.length ? { missingParts } : {})
    }
  })
  return { conversation, modelCalls }
}
