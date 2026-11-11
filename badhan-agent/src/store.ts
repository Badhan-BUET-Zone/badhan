// App state, persistence, and the agent loop.
//
// Settings (the OpenAI key, the model, the per-server Badhan tokens) live in localStorage. Chats
// live in IndexedDB: a tool result can run to tens of kilobytes, and localStorage's ~5 MB would
// fill within a few conversations.

import { createStore, del, entries, set } from 'idb-keyval'
import { markRaw, reactive, toRaw, watch } from 'vue'
import {
  CANCELLED_RESULT, DEFAULT_SYSTEM_PROMPT, NOT_SENT_RESULT, newId, settle, titleFrom, toApiMessages,
  type AssistantMessage, type Chat, type ChatMessage, type NoticeMessage, type ToolMessage, type UserMessage
} from './lib/chat.ts'
import { OpenAiError, streamCompletion, type ToolCall } from './lib/openai.ts'
import { buildRequest, buildTools, sendRequest, toOpenAiTool, type ApiTool, type OpenApiSpec } from './lib/openapi.ts'
import { SERVERS, SERVER_IDS, isServerId, type ServerId } from './lib/servers.ts'
import { designationName, hallName } from './lib/vocabulary.ts'

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

// 'writes': GETs run on their own, anything that changes data waits for a click.
export type ApprovalMode = 'none' | 'writes' | 'all'

export interface Settings {
  apiKey: string
  model: string
  approval: ApprovalMode
  maxSteps: number
  server: ServerId
  tokens: Record<ServerId, string>
  defaultSystemPrompt: string
}

const SETTINGS_KEY = 'badhan-agent:settings'

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'gpt-5-mini',
  approval: 'writes',
  maxSteps: 20,
  server: 'development',
  tokens: { development: '', production: '', local: '' },
  defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT
}

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      server: isServerId(saved.server) ? saved.server : DEFAULT_SETTINGS.server,
      tokens: { ...DEFAULT_SETTINGS.tokens, ...(saved.tokens || {}) }
    }
  } catch {
    return { ...DEFAULT_SETTINGS, tokens: { ...DEFAULT_SETTINGS.tokens } }
  }
}

export const settings = reactive<Settings>(loadSettings())

watch(settings, () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked (private window). Settings then last for this tab only.
  }
}, { deep: true })

// Production always asks before a write, whatever the setting: its records are real donors.
export function needsApproval(tool: ApiTool, server: ServerId): boolean {
  if (settings.approval === 'all') return true
  if (!tool.isWrite) return false
  return settings.approval === 'writes' || SERVERS[server].live
}

// ---------------------------------------------------------------------------------------------
// Per-server state: the tool list, and who is signed in
// ---------------------------------------------------------------------------------------------

export interface SpecState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  tools: ApiTool[]
  // /llms.txt: the same spec as compact Markdown, written by the backend for AI assistants.
  reference: string
  error: string
}

export interface Profile {
  status: 'signed-out' | 'checking' | 'signed-in' | 'rejected' | 'error'
  name?: string
  designation?: string
  hall?: string
  error?: string
}

const emptySpec = (): SpecState => ({ status: 'idle', tools: [], reference: '', error: '' })

export const state = reactive({
  loaded: false,
  chats: [] as Chat[],
  activeId: null as string | null,
  running: {} as Record<string, boolean>,
  specs: Object.fromEntries(SERVER_IDS.map((id) => [id, emptySpec()])) as Record<ServerId, SpecState>,
  profiles: Object.fromEntries(SERVER_IDS.map((id) => [id, { status: 'signed-out' }])) as Record<ServerId, Profile>
})

const unreachable = (server: ServerId, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|networkerror|load failed/i.test(message)
    ? `${SERVERS[server].baseUrl} is unreachable${server === 'local' ? ' — is the backend container up?' : ''}`
    : message
}

const specLoads = new Map<ServerId, Promise<void>>()

// Shared by every caller: a send that arrives while the header is still loading the tools waits
// for that same load rather than failing on it.
export function loadSpec(server: ServerId, force = false): Promise<void> {
  const spec = state.specs[server]
  const inflight = specLoads.get(server)
  if (inflight) return inflight
  if (!force && spec.status === 'ready') return Promise.resolve()

  const load = (async () => {
    spec.status = 'loading'
    spec.error = ''
    const base = SERVERS[server].baseUrl
    try {
      const [specResponse, referenceResponse] = await Promise.all([
        fetch(`${base}/openapi.json`, { cache: 'no-store' }),
        fetch(`${base}/llms.txt`, { cache: 'no-store' }).catch(() => null)
      ])
      if (!specResponse.ok) throw new Error(`GET /openapi.json answered ${specResponse.status}`)
      const json: OpenApiSpec = await specResponse.json()
      // A server deployed before /llms.txt existed still has the encoding vocabulary in the spec's
      // own description, which is the part the model cannot do without.
      const reference = referenceResponse?.ok ? await referenceResponse.text() : (json.info?.description || '')
      spec.tools = markRaw(buildTools(json))
      spec.reference = reference
      spec.status = 'ready'
    } catch (error) {
      spec.status = 'error'
      spec.error = unreachable(server, error)
    } finally {
      specLoads.delete(server)
    }
  })()
  specLoads.set(server, load)
  return load
}

export async function loadProfile(server: ServerId): Promise<void> {
  const profile = state.profiles[server]
  const token = settings.tokens[server]
  if (!token) {
    Object.assign(profile, { status: 'signed-out', name: undefined, designation: undefined, hall: undefined, error: undefined })
    return
  }
  profile.status = 'checking'
  try {
    const response = await fetch(`${SERVERS[server].baseUrl}/users/me`, { headers: { 'x-auth': token } })
    const data = await response.json().catch(() => ({}))
    if (response.status === 401) {
      Object.assign(profile, { status: 'rejected', error: data.message || 'The server rejected the saved token.' })
      return
    }
    if (!response.ok || !data.donor) throw new Error(data.message || `GET /users/me answered ${response.status}`)
    Object.assign(profile, {
      status: 'signed-in',
      name: data.donor.name,
      designation: designationName(data.donor.designation),
      hall: hallName(data.donor.hall),
      error: undefined
    })
  } catch (error) {
    Object.assign(profile, { status: 'error', error: unreachable(server, error) })
  }
}

export async function signIn(server: ServerId, phone: string, password: string): Promise<void> {
  const digits = phone.replace(/\D/g, '')
  // The API takes the full 13-digit number; members usually type the 11-digit local one.
  const full = digits.length === 11 && digits.startsWith('01') ? `88${digits}` : digits
  const response = await fetch(`${SERVERS[server].baseUrl}/users/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: Number(full), password })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.token) throw new Error(data.message || `Sign-in answered ${response.status}`)
  settings.tokens[server] = data.token
  await loadProfile(server)
}

export async function useToken(server: ServerId, token: string): Promise<void> {
  settings.tokens[server] = token.trim()
  await loadProfile(server)
}

export async function signOut(server: ServerId): Promise<void> {
  const token = settings.tokens[server]
  settings.tokens[server] = ''
  await loadProfile(server)
  if (!token) return
  // Revoke it on the server too, so the token stops working everywhere. Best effort: a token the
  // server already forgot is signed out either way.
  await fetch(`${SERVERS[server].baseUrl}/users/signout`, { method: 'DELETE', headers: { 'x-auth': token } }).catch(() => {})
}

// ---------------------------------------------------------------------------------------------
// Chats and persistence
// ---------------------------------------------------------------------------------------------

const chatStore = createStore('badhan-agent', 'chats')
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function saveChat(chat: Chat, immediately = false): void {
  clearTimeout(saveTimers.get(chat.id))
  const write = () => {
    saveTimers.delete(chat.id)
    // A run that finishes after its chat was deleted must not write it back.
    if (!state.chats.some((candidate) => candidate.id === chat.id)) return
    // structuredClone of the raw object: IndexedDB cannot store a Vue proxy.
    set(chat.id, structuredClone(toRaw(chat)), chatStore).catch((error) => console.error('Saving the chat failed', error))
  }
  if (immediately) write()
  else saveTimers.set(chat.id, setTimeout(write, 400))
}

export async function loadChats(): Promise<void> {
  try {
    const stored = await entries<string, Chat>(chatStore)
    state.chats = stored.map(([, chat]) => settle(chat)).sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (error) {
    console.error('Reading saved chats failed', error)
  }
  state.activeId = state.chats[0]?.id ?? null
  state.loaded = true
}

export const activeChat = (): Chat | undefined => state.chats.find((chat) => chat.id === state.activeId)

export function createChat(): Chat {
  const now = Date.now()
  state.chats.unshift({
    id: newId(),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    server: settings.server,
    systemPrompt: settings.defaultSystemPrompt,
    attachReference: true,
    messages: []
  })
  // Hand back the reactive copy, not the plain object pushed in: only mutations through the proxy
  // reach the screen.
  const chat = state.chats[0]
  state.activeId = chat.id
  saveChat(chat, true)
  return chat
}

export function deleteChat(id: string): void {
  stop(id)
  const index = state.chats.findIndex((chat) => chat.id === id)
  if (index < 0) return
  state.chats.splice(index, 1)
  del(id, chatStore).catch(() => {})
  if (state.activeId === id) state.activeId = state.chats[Math.min(index, state.chats.length - 1)]?.id ?? null
}

function touch(chat: Chat): void {
  chat.updatedAt = Date.now()
  const index = state.chats.indexOf(chat)
  if (index > 0) {
    state.chats.splice(index, 1)
    state.chats.unshift(chat)
  }
}

function append<T extends ChatMessage>(chat: Chat, message: T): T {
  chat.messages.push(message)
  return chat.messages[chat.messages.length - 1] as T
}

// ---------------------------------------------------------------------------------------------
// The agent loop
// ---------------------------------------------------------------------------------------------

// What the model is sent of one tool result. Enough for a few hundred donor records; anything
// longer is cut, and the model is told so, rather than overflowing its context.
const MAX_RESULT_CHARS = 60_000
// What the card shows. Larger, since a person can scroll; bounded so storage stays sane.
const MAX_DISPLAY_CHARS = 250_000

const clip = (text: string, max: number, note: string) =>
  text.length <= max ? text : `${text.slice(0, max)}\n… [${note}: ${text.length - max} more characters]`

const controllers = new Map<string, AbortController>()
const approvals = new Map<string, (approved: boolean) => void>()

export function systemMessage(chat: Chat): string {
  const server = SERVERS[chat.server]
  const profile = state.profiles[chat.server]
  const now = new Date()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const signedIn = profile.status === 'signed-in'
    ? `yes, as ${profile.name} (${profile.designation}, ${profile.hall})`
    : 'no — most routes will answer 401 until the user signs in from the app header'
  const parts = [
    chat.systemPrompt.trim(),
    [
      '## Session',
      `- Server: ${server.label} — ${server.baseUrl}${server.live ? ' (PRODUCTION: real donor data; every request is live)' : ''}`,
      `- Signed in: ${signedIn}`,
      `- Current time: ${now.toString()} — ${now.getTime()} in Unix milliseconds (time zone ${zone})`
    ].join('\n')
  ]
  const reference = state.specs[chat.server].reference
  if (chat.attachReference && reference) parts.push(`## API reference\n\n${reference.trim()}`)
  return parts.filter(Boolean).join('\n\n')
}

export function resolveApproval(toolCallId: string, approved: boolean): void {
  approvals.get(toolCallId)?.(approved)
  approvals.delete(toolCallId)
}

export function stop(chatId: string): void {
  controllers.get(chatId)?.abort()
}

export async function send(chat: Chat, text: string): Promise<void> {
  const content = text.trim()
  if (!content || state.running[chat.id]) return
  if (!chat.messages.some((message) => message.role === 'user')) chat.title = titleFrom(content)
  append<UserMessage>(chat, { id: newId(), role: 'user', content, createdAt: Date.now() })
  touch(chat)
  saveChat(chat, true)
  await run(chat)
}

// Re-runs the model on the chat as it stands — after an OpenAI error, say, once the key is fixed.
export async function retry(chat: Chat): Promise<void> {
  while (chat.messages.at(-1)?.role === 'notice') chat.messages.pop()
  await run(chat)
}

async function run(chat: Chat): Promise<void> {
  if (state.running[chat.id]) return
  const controller = new AbortController()
  controllers.set(chat.id, controller)
  state.running[chat.id] = true
  const notice = (content: string, level: NoticeMessage['level']) =>
    append<NoticeMessage>(chat, { id: newId(), role: 'notice', content, level, createdAt: Date.now() })

  try {
    if (!settings.apiKey) throw new OpenAiError('Add your OpenAI API key in Settings to start.')
    await loadSpec(chat.server)
    const spec = state.specs[chat.server]
    if (spec.status !== 'ready') throw new Error(`The tools for ${SERVERS[chat.server].label} did not load: ${spec.error}`)

    for (let step = 0; ; step++) {
      if (step >= settings.maxSteps) {
        notice(`Stopped after ${settings.maxSteps} model calls in one turn (the limit in Settings). Send a message to carry on.`, 'info')
        break
      }

      // Re-read every step: the user may switch servers or sign in while a turn is under way.
      const tools = state.specs[chat.server].tools
      const assistant = append<AssistantMessage>(chat, {
        id: newId(), role: 'assistant', content: '', model: settings.model, streaming: true, createdAt: Date.now()
      })
      const completion = await streamCompletion({
        apiKey: settings.apiKey,
        model: settings.model,
        messages: toApiMessages({ ...chat, messages: chat.messages.slice(0, -1) }, systemMessage(chat)),
        tools: tools.map(toOpenAiTool),
        signal: controller.signal,
        onText: (delta) => { assistant.content += delta }
      })
      assistant.streaming = false
      assistant.usage = completion.usage
      if (completion.toolCalls.length) assistant.tool_calls = completion.toolCalls
      touch(chat)
      saveChat(chat)

      if (!completion.toolCalls.length) {
        if (completion.finishReason === 'length') notice('The answer was cut off at the model\'s output limit.', 'info')
        break
      }

      // One result message per call, created up front so the cards show the whole plan at once.
      const results = completion.toolCalls.map((call) => append<ToolMessage>(chat, {
        id: newId(),
        role: 'tool',
        tool_call_id: call.id,
        content: '',
        createdAt: Date.now(),
        run: { status: 'pending', name: call.function.name, server: chat.server }
      }))
      // In order, one at a time: a turn often reads, then writes on what it read.
      for (let i = 0; i < completion.toolCalls.length; i++) {
        controller.signal.throwIfAborted()
        await runTool(chat, completion.toolCalls[i], results[i], tools, controller.signal)
        saveChat(chat)
      }
    }
  } catch (error) {
    const last = chat.messages.at(-1)
    if (last?.role === 'assistant' && last.streaming) {
      last.streaming = false
      // An answer cut off mid-stream is kept, but one that never started is just noise.
      if (!last.content) chat.messages.pop()
    }
    if (controller.signal.aborted) notice('Stopped.', 'info')
    else notice(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    for (const message of chat.messages) {
      if (message.role !== 'tool') continue
      if (message.run.status === 'pending' || message.run.status === 'awaiting-approval') {
        resolveApproval(message.tool_call_id, false)
        message.run.status = 'cancelled'
        message.content = NOT_SENT_RESULT
      }
    }
    controllers.delete(chat.id)
    delete state.running[chat.id]
    touch(chat)
    saveChat(chat, true)
  }
}

async function runTool(chat: Chat, call: ToolCall, result: ToolMessage, tools: ApiTool[], signal: AbortSignal): Promise<void> {
  const run = result.run
  const fail = (note: string) => {
    run.status = 'failed'
    run.note = note
    result.content = JSON.stringify({ error: note })
  }

  const tool = tools.find((candidate) => candidate.name === call.function.name)
  if (!tool) return fail(`There is no tool named "${call.function.name}".`)
  run.method = tool.method
  run.path = tool.path

  let args: Record<string, any>
  try {
    args = call.function.arguments.trim() ? JSON.parse(call.function.arguments) : {}
    run.args = args
  } catch {
    run.args = call.function.arguments
    return fail('The arguments were not valid JSON.')
  }

  const server = chat.server
  let request
  try {
    request = buildRequest(SERVERS[server].baseUrl, tool, args)
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
  run.url = request.url
  run.body = request.body
  run.server = server

  if (needsApproval(tool, server)) {
    run.status = 'awaiting-approval'
    saveChat(chat)
    const approved = await new Promise<boolean>((resolve) => {
      approvals.set(call.id, resolve)
      signal.addEventListener('abort', () => resolve(false), { once: true })
    })
    approvals.delete(call.id)
    signal.throwIfAborted()
    if (!approved) {
      run.status = 'denied'
      result.content = JSON.stringify({ error: 'The user declined this request, so it was not sent. Ask before trying something else.' })
      return
    }
  }

  run.status = 'running'
  try {
    const response = await sendRequest(request, settings.tokens[server], signal)
    let body = response.body

    // Sign-in through the chat: the app keeps the token, and the model is told it worked without
    // ever seeing it.
    if (tool.method === 'POST' && tool.path === '/users/signin' && response.ok && body && typeof body === 'object' && 'token' in body) {
      settings.tokens[server] = String((body as Record<string, unknown>).token)
      body = { ...(body as object), token: '[kept by the app; later calls are signed in]' }
      void loadProfile(server)
    }
    if (tool.method === 'DELETE' && /^\/users\/signout(\/all)?$/.test(tool.path) && response.ok) {
      settings.tokens[server] = ''
      void loadProfile(server)
    }

    run.status = 'done'
    run.httpStatus = response.httpStatus
    run.durationMs = response.durationMs
    run.response = clip(typeof body === 'string' ? body : JSON.stringify(body, null, 2), MAX_DISPLAY_CHARS, 'not shown')
    result.content = clip(JSON.stringify({ httpStatus: response.httpStatus, body }), MAX_RESULT_CHARS, 'truncated by the app')
  } catch (error) {
    if (signal.aborted) {
      run.status = 'cancelled'
      result.content = CANCELLED_RESULT
      throw error
    }
    fail(`The request did not complete: ${unreachable(server, error)}`)
  }
}
