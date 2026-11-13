import { AGENT_MODEL, AGENT_REASONING_EFFORT, MAX_DISPLAY_CHARS, OPENAI_TIMEOUT_MS } from './constants'
import { clip } from './conversation'

// One non-streaming Chat Completions call, with Node's built-in fetch and no SDK.
//
// Not streamed: App Engine standard sends each response in one piece, so a stream from OpenAI
// would only be buffered here and sent on whole anyway.
//
// THE KEY NEVER LEAVES THIS FILE. It goes in the Authorization header and nowhere else: not into
// an error message, not into a log line. OpenAI's own 401 message quotes part of the key it was
// given, which is why a refused key gets a message of ours instead of theirs, and why its body is
// never kept for the call record either.

const OPENAI_BASE: string = 'https://api.openai.com/v1'

// Node 22 has a global fetch; the @types/node this project pins predates it. These are the only
// parts of it used here.
interface IFetchResponse {
  ok: boolean
  status: number
  statusText: string
  headers: { get: (name: string) => string | null }
  text: () => Promise<string>
}
type FetchFunction = (url: string, init: { method: string, headers: Record<string, string>, body: string, signal: AbortSignal }) => Promise<IFetchResponse>

export type OpenAiFailureKind = 'refused' | 'quota' | 'unreachable' | 'other'

// What one call sends besides the messages and the tools: the model and its reasoning setting.
export interface IRequestSettings {
  model: string
  reasoning_effort: string
}

export const requestSettings = (): IRequestSettings => ({ model: AGENT_MODEL, reasoning_effort: AGENT_REASONING_EFFORT })

// The exact body of a call. The call record rebuilds it with this same function, so what the
// download shows is what was sent. Tools are left out when there are none, as OpenAI requires.
export const requestBodyOf = (settings: IRequestSettings, messages: any[] | null, tools: any[]): Record<string, any> => {
  const { model, ...rest } = settings
  return { model, messages, ...(tools.length ? { tools } : {}), ...rest }
}

// What the call record keeps of the exchange itself, success or failure.
export interface ICallTrace {
  // OpenAI's x-request-id response header; null when no answer came back at all.
  requestId: string | null
  durationMs: number
}

// What a failed call leaves for the record. `body` is OpenAI's answer as text, bounded; null when
// there was no answer, and always null for a refused key (it quotes part of the key).
export interface ICallFailure extends ICallTrace {
  kind: OpenAiFailureKind
  httpStatus: number | null
  body: string | null
}

export class OpenAiError extends Error {
  public readonly kind: OpenAiFailureKind
  public readonly failure: ICallFailure

  constructor (kind: OpenAiFailureKind, message: string, failure: Omit<ICallFailure, 'kind'>) {
    super(message)
    this.kind = kind
    this.failure = { kind, ...failure }
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
  // OpenAI's whole answer, parsed, for the call record.
  raw: any
  trace: ICallTrace
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
  { apiKey, settings, messages, tools }: { apiKey: string, settings: IRequestSettings, messages: any[], tools: any[] }
): Promise<ICompletion> => {
  const fetchFn: FetchFunction = (globalThis as any).fetch
  const controller: AbortController = new AbortController()
  const timer: NodeJS.Timeout = setTimeout((): void => controller.abort(), OPENAI_TIMEOUT_MS)
  const startedAt: number = Date.now()

  let response: IFetchResponse
  let raw: string
  try {
    response = await fetchFn(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBodyOf(settings, messages, tools)),
      signal: controller.signal
    })
    raw = await response.text()
  } catch {
    // A timeout (the abort above), a DNS failure, a refused connection: no answer at all. The
    // underlying error is not passed on; it says nothing a member could act on.
    throw new OpenAiError('unreachable', 'OpenAI could not be reached.',
      { requestId: null, durationMs: Date.now() - startedAt, httpStatus: null, body: null })
  } finally {
    clearTimeout(timer)
  }

  const trace: ICallTrace = { requestId: response.headers.get('x-request-id'), durationMs: Date.now() - startedAt }
  const failure = (keepBody: boolean): Omit<ICallFailure, 'kind'> =>
    ({ ...trace, httpStatus: response.status, body: keepBody ? clip(raw, MAX_DISPLAY_CHARS, 'cut') : null })

  if (response.status === 401) {
    throw new OpenAiError('refused', 'The server\'s OpenAI key was refused. Tell a super admin.', failure(false))
  }
  if (!response.ok) {
    const reason: string = openAiMessage(raw) || `OpenAI answered ${response.status} ${response.statusText}`.trim()
    throw new OpenAiError(response.status === 429 ? 'quota' : 'other', `OpenAI: ${reason}`, failure(true))
  }

  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    throw new OpenAiError('other', 'OpenAI sent an answer that could not be read.', failure(true))
  }
  const choice: any = data && Array.isArray(data.choices) ? data.choices[0] : null
  if (!choice || !choice.message) {
    throw new OpenAiError('other', 'OpenAI sent an answer with nothing in it.', failure(true))
  }

  const message: any = choice.message
  return {
    content: `${message.content || ''}${message.refusal || ''}`,
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    usage: data.usage || null,
    finishReason: choice.finish_reason || null,
    model: typeof data.model === 'string' ? data.model : settings.model,
    raw: data,
    trace
  }
}
