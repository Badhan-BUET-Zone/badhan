import { AGENT_MODEL, AGENT_REASONING_EFFORT, OPENAI_TIMEOUT_MS } from './constants'

// One non-streaming Chat Completions call, with Node's built-in fetch and no SDK.
//
// Not streamed: App Engine standard sends each response in one piece, so a stream from OpenAI
// would only be buffered here and sent on whole anyway.
//
// THE KEY NEVER LEAVES THIS FILE. It goes in the Authorization header and nowhere else: not into
// an error message, not into a log line. OpenAI's own 401 message quotes part of the key it was
// given, which is why a refused key gets a message of ours instead of theirs.

const OPENAI_BASE: string = 'https://api.openai.com/v1'

// Node 22 has a global fetch; the @types/node this project pins predates it. These are the only
// parts of it used here.
interface IFetchResponse {
  ok: boolean
  status: number
  statusText: string
  text: () => Promise<string>
}
type FetchFunction = (url: string, init: { method: string, headers: Record<string, string>, body: string, signal: AbortSignal }) => Promise<IFetchResponse>

export type OpenAiFailureKind = 'refused' | 'quota' | 'unreachable' | 'other'

export class OpenAiError extends Error {
  public readonly kind: OpenAiFailureKind

  constructor (kind: OpenAiFailureKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export interface ICompletion {
  // The answer's text. Empty when the answer is only tool calls.
  content: string
  // Exactly as OpenAI returned them: { id, type: 'function', function: { name, arguments } }
  toolCalls: any[]
  usage: { prompt_tokens?: number, completion_tokens?: number, total_tokens?: number } | null
  // 'stop', 'tool_calls', 'length' (cut off at the output limit), ...
  finishReason: string | null
  model: string
}

const openAiMessage = (raw: string): string | null => {
  try {
    const data: any = JSON.parse(raw)
    return data && data.error && typeof data.error.message === 'string' ? data.error.message : null
  } catch {
    return null
  }
}

export const createCompletion = async (
  { apiKey, messages, tools }: { apiKey: string, messages: any[], tools: any[] }
): Promise<ICompletion> => {
  const fetchFn: FetchFunction = (globalThis as any).fetch
  const controller: AbortController = new AbortController()
  const timer: NodeJS.Timeout = setTimeout((): void => controller.abort(), OPENAI_TIMEOUT_MS)

  let response: IFetchResponse
  let raw: string
  try {
    response = await fetchFn(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages,
        ...(tools.length ? { tools } : {}),
        reasoning_effort: AGENT_REASONING_EFFORT
      }),
      signal: controller.signal
    })
    raw = await response.text()
  } catch {
    // A timeout (the abort above), a DNS failure, a refused connection: no answer at all. The
    // underlying error is not passed on; it says nothing a member could act on.
    throw new OpenAiError('unreachable', 'OpenAI could not be reached.')
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401) {
    throw new OpenAiError('refused', 'The server\'s OpenAI key was refused. Tell a super admin.')
  }
  if (!response.ok) {
    const reason: string = openAiMessage(raw) || `OpenAI answered ${response.status} ${response.statusText}`.trim()
    throw new OpenAiError(response.status === 429 ? 'quota' : 'other', `OpenAI: ${reason}`)
  }

  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    throw new OpenAiError('other', 'OpenAI sent an answer that could not be read.')
  }
  const choice: any = data && Array.isArray(data.choices) ? data.choices[0] : null
  if (!choice || !choice.message) {
    throw new OpenAiError('other', 'OpenAI sent an answer with nothing in it.')
  }

  const message: any = choice.message
  return {
    content: `${message.content || ''}${message.refusal || ''}`,
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    usage: data.usage || null,
    finishReason: choice.finish_reason || null,
    model: typeof data.model === 'string' ? data.model : AGENT_MODEL
  }
}
