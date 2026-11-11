// A minimal OpenAI Chat Completions client: streaming text and tool calls, straight from the
// browser with the user's own key. No SDK — fetch and a server-sent-events reader are all it takes.

import type { OpenAiTool } from './openapi.ts'

const API_BASE = 'https://api.openai.com/v1'

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ApiMessage =
  | { role: 'system' | 'developer'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  prompt_tokens_details?: { cached_tokens?: number }
}

export interface Completion {
  content: string
  toolCalls: ToolCall[]
  usage?: Usage
  finishReason?: string
}

export class OpenAiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

async function failure(response: Response): Promise<OpenAiError> {
  let message = `OpenAI answered ${response.status} ${response.statusText}`.trim()
  try {
    const data = await response.json()
    if (data?.error?.message) message = `OpenAI: ${data.error.message}`
  } catch {
    // Not JSON; the status line is all there is.
  }
  return new OpenAiError(message, response.status)
}

export async function streamCompletion(options: {
  apiKey: string
  model: string
  messages: ApiMessage[]
  tools: OpenAiTool[]
  signal?: AbortSignal
  onText?: (delta: string) => void
}): Promise<Completion> {
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      ...(options.tools.length ? { tools: options.tools } : {}),
      stream: true,
      stream_options: { include_usage: true }
    }),
    signal: options.signal
  })
  if (!response.ok || !response.body) throw await failure(response)

  const completion: Completion = { content: '', toolCalls: [] }
  // Tool calls arrive in fragments keyed by index: the first carries the id and name, the rest
  // append to the JSON arguments string.
  const calls: ToolCall[] = []

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handle = (line: string) => {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    const chunk = JSON.parse(data)
    if (chunk.error) throw new OpenAiError(`OpenAI: ${chunk.error.message || 'stream error'}`)
    if (chunk.usage) completion.usage = chunk.usage
    const choice = chunk.choices?.[0]
    if (!choice) return
    if (choice.finish_reason) completion.finishReason = choice.finish_reason
    const delta = choice.delta || {}
    const text = (delta.content || '') + (delta.refusal || '')
    if (text) {
      completion.content += text
      options.onText?.(text)
    }
    for (const fragment of delta.tool_calls || []) {
      const call = (calls[fragment.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } })
      if (fragment.id) call.id = fragment.id
      if (fragment.function?.name) call.function.name += fragment.function.name
      if (fragment.function?.arguments) call.function.arguments += fragment.function.arguments
    }
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf('\n')) >= 0) {
      handle(buffer.slice(0, newline).trim())
      buffer = buffer.slice(newline + 1)
    }
  }
  handle(buffer.trim())

  completion.toolCalls = calls.filter(Boolean)
  return completion
}

// The chat models on this key, for the model picker. Embeddings, audio, image and moderation models
// cannot drive a tool-calling chat, so they are left out.
export async function listChatModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!response.ok) throw await failure(response)
  const data = await response.json()
  return (data.data || [])
    .map((model: { id: string }) => model.id)
    .filter((id: string) => /^(gpt-|o\d|chatgpt-)/.test(id))
    .filter((id: string) => !/(audio|realtime|transcribe|tts|image|search|embedding|moderation|instruct)/.test(id))
    .sort()
}
