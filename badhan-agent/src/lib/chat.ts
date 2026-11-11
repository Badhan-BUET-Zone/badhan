// What a chat is, how it is stored, and how it becomes the message list OpenAI is sent.

import type { ApiMessage, ToolCall, Usage } from './openai.ts'
import type { ServerId } from './servers.ts'

export type ToolStatus =
  | 'pending' // queued behind an earlier call of the same turn
  | 'awaiting-approval'
  | 'running'
  | 'done' // the server answered (any HTTP status)
  | 'failed' // no answer: bad arguments, unknown tool, network error
  | 'denied'
  | 'cancelled'

export interface ToolRun {
  status: ToolStatus
  name: string
  method?: string
  path?: string
  url?: string
  server?: ServerId
  args?: unknown
  body?: unknown
  httpStatus?: number
  durationMs?: number
  // Pretty-printed for the card. The model's copy (the message content) is compact and clipped.
  response?: string
  note?: string
}

interface Base {
  id: string
  createdAt: number
}

export interface UserMessage extends Base {
  role: 'user'
  content: string
}

export interface AssistantMessage extends Base {
  role: 'assistant'
  content: string
  tool_calls?: ToolCall[]
  model?: string
  usage?: Usage
  streaming?: boolean
}

export interface ToolMessage extends Base {
  role: 'tool'
  tool_call_id: string
  content: string
  run: ToolRun
}

// Shown in the chat, never sent to the model: an OpenAI failure, a stopped run.
export interface NoticeMessage extends Base {
  role: 'notice'
  content: string
  level: 'error' | 'info'
}

export type ChatMessage = UserMessage | AssistantMessage | ToolMessage | NoticeMessage

export interface Chat {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  server: ServerId
  systemPrompt: string
  // Whether the server's /llms.txt goes into the system message.
  attachReference: boolean
  messages: ChatMessage[]
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

export const DEFAULT_SYSTEM_PROMPT = `You are Badhan Agent, an assistant for the members of Badhan, BUET Zone — a voluntary blood donation organisation at the Bangladesh University of Engineering and Technology. You work on the Badhan API through the tools you are given: each tool is one API route, and every call is a real request made as the signed-in member.

How to work:
- Fetch rather than guess. Look donors, donations, call records and reports up with the tools and answer from what they return.
- The API speaks indices, not names. Convert blood groups, halls and designations to their indices before a call, and back to names in your answer, using the API reference below.
- Dates are Unix timestamps in milliseconds. Use the current time given below to work out ranges such as "the last four months".
- Check each response's \`status\`. When it is "ERROR", report its \`message\` as it stands, and do not repeat the same call unchanged.
- Before a call that changes data (POST, PATCH, PUT or DELETE), say in one line what you are about to do. The app may ask the user to approve it.
- If a call answers 401, the user is not signed in on this server. Ask them to sign in from the app's header, so their password never passes through this chat.
- Donor records are personal data. Show only what was asked for, and keep answers short; a table suits a list of donors.`

export function titleFrom(text: string): string {
  const line = text.trim().split('\n')[0].replace(/\s+/g, ' ')
  return line.length > 60 ? `${line.slice(0, 59).trimEnd()}…` : line || 'New chat'
}

const UNFINISHED: ToolStatus[] = ['pending', 'awaiting-approval', 'running']

export const CANCELLED_RESULT = JSON.stringify({ error: 'Cancelled before it completed. The request may or may not have reached the server.' })
export const NOT_SENT_RESULT = JSON.stringify({ error: 'Cancelled before it was sent.' })

// A chat read back from storage may have been saved mid-run (the tab closed, the page reloaded).
// Nothing is running any more, so whatever was in flight is marked as cancelled.
export function settle(chat: Chat): Chat {
  for (const message of chat.messages) {
    if (message.role === 'assistant') message.streaming = false
    if (message.role === 'tool' && UNFINISHED.includes(message.run.status)) {
      const sent = message.run.status === 'running'
      message.run.status = 'cancelled'
      message.content = sent ? CANCELLED_RESULT : NOT_SENT_RESULT
    }
  }
  return chat
}

// The conversation as OpenAI expects it. Every tool call must be followed by its result, or the
// next request is rejected, so a call with no recorded result gets a synthetic one.
export function toApiMessages(chat: Chat, system: string): ApiMessage[] {
  const out: ApiMessage[] = [{ role: 'system', content: system }]
  const results = new Map<string, ToolMessage>()
  for (const message of chat.messages) if (message.role === 'tool') results.set(message.tool_call_id, message)

  for (const message of chat.messages) {
    if (message.role === 'user') {
      out.push({ role: 'user', content: message.content })
    } else if (message.role === 'assistant') {
      const calls = message.tool_calls?.length ? message.tool_calls : undefined
      if (!message.content && !calls) continue
      out.push({ role: 'assistant', content: message.content || null, ...(calls ? { tool_calls: calls } : {}) })
      for (const call of calls || []) {
        const result = results.get(call.id)
        out.push({ role: 'tool', tool_call_id: call.id, content: result?.content || NOT_SENT_RESULT })
      }
    }
    // Tool messages are placed right after the call they answer, above. Notices stay in the UI.
  }
  return out
}
