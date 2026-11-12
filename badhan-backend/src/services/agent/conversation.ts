import { MAX_AUTO_TITLE_CHARS, MAX_DISPLAY_CHARS, MAX_RESULT_CHARS } from './constants'

// How a stored chat becomes what OpenAI is sent, and what the model is told of each tool result.
// Ported from the browser (badhan-frontend/src/views/Agent.vue).

export type ToolRunStatus = 'pending' | 'done' | 'failed' | 'denied' | 'cancelled'

// The statuses the browser may report for a call it was handed. `pending` is the server's own.
export const REPORTED_TOOL_STATUSES: ToolRunStatus[] = ['done', 'failed', 'denied', 'cancelled']

export const clip = (text: string, max: number, note: string): string =>
  text.length <= max ? text : `${text.slice(0, max)}\n… [${note}: ${text.length - max} more characters]`

export const titleFrom = (text: string): string => {
  const line: string = text.trim().split('\n')[0].replace(/\s+/g, ' ')
  return line.length > MAX_AUTO_TITLE_CHARS
    ? `${line.slice(0, MAX_AUTO_TITLE_CHARS - 1).trimEnd()}…`
    : line || 'New chat'
}

// What the model is told for calls that never produced a result.
const errorResult = (error: string): string => JSON.stringify({ error })

// A call still pending when the chat moved on: the browser never reported it, so nobody knows
// whether the request reached the API.
export const NO_RESULT_RECORDED: string = 'No result was recorded; the request may or may not have reached the server.'
export const NO_RESULT_RECORDED_CONTENT: string = errorResult(NO_RESULT_RECORDED)

// The stand-in for a call with no tool message at all, which OpenAI would otherwise refuse: every
// tool call must be followed by its result.
const NOT_SENT_CONTENT: string = errorResult('Cancelled before it was sent.')

const CANCELLED_CONTENT: string = errorResult('Cancelled before it completed. The request may or may not have reached the server.')

const DENIED_CONTENT: string = errorResult('The user declined this request, so it was not sent. Ask before trying something else.')

// What the card shows of a response. The browser sends the body as text; this only bounds it.
export const displayCopyOf = (response: string): string => clip(response, MAX_DISPLAY_CHARS, 'not shown')

/**
 * The model's copy of one result the browser reported.
 *
 * A JSON body is re-serialised compactly, so the model is not sent the indentation the card shows;
 * a body that does not parse (plain text, or one the browser already had to cut) goes as a string.
 */
export const modelCopyOf = (
  status: ToolRunStatus,
  { httpStatus, response, note }: { httpStatus?: number | null, response?: string | null, note?: string | null }
): string => {
  if (status === 'done') {
    let body: any = response ?? ''
    if (typeof response === 'string') {
      try {
        body = JSON.parse(response)
      } catch {
        body = response
      }
    }
    return clip(JSON.stringify({ httpStatus: httpStatus ?? null, body }), MAX_RESULT_CHARS, 'truncated by the app')
  }
  if (status === 'denied') return DENIED_CONTENT
  if (status === 'cancelled') return CANCELLED_CONTENT
  return errorResult(note || 'The request did not complete.')
}

// The parts of a stored message that the model's history is built from.
export interface IHistoryMessage {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  toolCalls?: any[]
  toolCallId?: string
}

/**
 * The conversation as OpenAI expects it: the system prompt, then the chat in order. Each assistant
 * message that called tools is followed straight away by one result per call, matched by id, so a
 * result is never out of place and a call with no result gets the stand-in rather than an error.
 * An assistant message with neither text nor calls says nothing, and is left out.
 */
export const toApiMessages = (messages: IHistoryMessage[], system: string): any[] => {
  const out: any[] = [{ role: 'system', content: system }]
  const results: Map<string, IHistoryMessage> = new Map()
  for (const message of messages) {
    if (message.role === 'tool' && message.toolCallId) results.set(message.toolCallId, message)
  }

  for (const message of messages) {
    if (message.role === 'user') {
      out.push({ role: 'user', content: message.content || '' })
    } else if (message.role === 'assistant') {
      const calls: any[] | null = message.toolCalls && message.toolCalls.length ? message.toolCalls : null
      if (!message.content && !calls) continue
      out.push({ role: 'assistant', content: message.content || null, ...(calls ? { tool_calls: calls } : {}) })
      for (const call of calls || []) {
        const result: IHistoryMessage | undefined = results.get(call.id)
        out.push({ role: 'tool', tool_call_id: call.id, content: (result && result.content) || NOT_SENT_CONTENT })
      }
    }
    // Tool messages are placed right after the call they answer, above.
  }
  return out
}
