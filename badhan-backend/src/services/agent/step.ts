import { Types } from 'mongoose'
import * as agentChatInterface from '../../db/interfaces/agentChatInterface'
import * as logInterface from '../../db/interfaces/logInterface'
import { OPENAI_API_KEY } from '../../dotenv'
import { MAX_MODEL_CALLS_PER_MESSAGE, MAX_NOTE_CHARS, STEP_LOCK_STALE_MS } from './constants'
import {
  clip, displayCopyOf, IHistoryMessage, modelCopyOf, NO_RESULT_RECORDED, NO_RESULT_RECORDED_CONTENT,
  titleFrom, toApiMessages, ToolRunStatus
} from './conversation'
import { answeredCallRecord, failedCallRecord, requestPartsOf } from './callRecord'
import { createCompletion, ICompletion, IRequestSettings, OpenAiError, requestSettings } from './openai'
import { FIXED_SYSTEM_PROMPT, ISessionMember, joinSystemPrompt, sessionNote } from './prompt'
import { buildRequest, findTool, getTools, IAgentRequest, IAgentTool, toOpenAiTool } from './tools'

// One agent step: the backend's whole part in a turn.
//
//   browser                         backend (this file)
//   ───────                         ──────────────────
//   the member's message ─────────▶ save it, ONE model call, save the answer and one tool message
//                                   per call it asked for, each already turned into a request
//   run each pending call, then
//   report it (recordToolCallResult) ▶ store the result and the model's copy of it
//   nothing pending: continue ─────▶ another step, with no new message
//
// The loop ends when an answer asks for no tools, or after MAX_MODEL_CALLS_PER_MESSAGE model calls
// since the member last wrote. The browser stops itself at that number; the 409 here is what holds
// if it does not.
//
// THE ORDER IS FIXED. Every check that can refuse the request comes before anything is saved, and
// the ones that depend only on the chat's state come before the key check, so a test suite with no
// key can still reach them.

export type StepRoute = 'create' | 'message' | 'continue'

export type StepConflictReason = 'busy' | 'limit' | 'nothingToContinue'

export type StepOutcome =
  | { kind: 'ok', chat: any, messages: any[], finishReason: string | null }
  | { kind: 'notFound' }
  | { kind: 'conflict', reason: StepConflictReason, message: string }
  | { kind: 'notConfigured' }
  // The model call failed. What was saved before it (the member's message) stays, so Retry is
  // simply `continue`, and the chat is returned so a brand-new chat can be retried at all.
  | { kind: 'modelFailed', message: string, chat: any, messages: any[] }

export const CONFLICT_MESSAGES: Record<StepConflictReason | 'alreadyAnswered', string> = {
  busy: 'This chat is busy in another tab or window.',
  limit: `Stopped after ${MAX_MODEL_CALLS_PER_MESSAGE} model calls for one message. Send a message to carry on.`,
  nothingToContinue: 'There is nothing to continue: the last answer is finished. Send a message to carry on.',
  alreadyAnswered: 'This tool call already has a result.'
}

export const isAgentConfigured = (): boolean => !!OPENAI_API_KEY

const conflict = (reason: StepConflictReason): StepOutcome => ({ kind: 'conflict', reason, message: CONFLICT_MESSAGES[reason] })

/**
 * The tool message for one call the model asked for: `pending` with its request and label already
 * worked out, or `failed` with a note the model is shown, when no request can be built from it.
 */
const toolMessageFor = (call: any, createdAt: number): Record<string, any> => {
  const name: string = (call && call.function && call.function.name) || ''
  const tool: IAgentTool | undefined = findTool(name)
  const run: Record<string, any> = {
    status: 'pending',
    name,
    label: tool ? tool.label : 'An action that does not exist',
    method: tool ? tool.method : null,
    path: tool ? tool.path : null,
    args: null,
    body: null,
    isWrite: tool ? tool.isWrite : false,
    httpStatus: null,
    durationMs: null,
    response: null,
    note: null
  }
  const message: Record<string, any> = { role: 'tool', toolCallId: String((call && call.id) || ''), content: '', createdAt, run }
  const fail = (note: string): Record<string, any> => {
    run.status = 'failed'
    run.note = note
    message.content = JSON.stringify({ error: note })
    return message
  }

  if (!tool) return fail(`There is no tool named "${name}".`)

  const rawArgs: string = (call.function && typeof call.function.arguments === 'string') ? call.function.arguments : ''
  let args: any
  try {
    args = rawArgs.trim() ? JSON.parse(rawArgs) : {}
  } catch {
    run.args = rawArgs
    return fail('The arguments were not valid JSON.')
  }
  run.args = args
  if (!args || typeof args !== 'object' || Array.isArray(args)) return fail('The arguments must be a JSON object.')

  let request: IAgentRequest
  try {
    request = buildRequest(tool, args)
  } catch (error: any) {
    return fail(error instanceof Error ? error.message : String(error))
  }
  run.path = request.path
  run.body = request.body === undefined ? null : request.body
  return message
}

// `ownerId` is the caller's donor id, and `member` is who the session note says they are.
export const runStep = async (
  { route, chatId, ownerId, member, content }:
    { route: StepRoute, chatId?: string, ownerId: Types.ObjectId, member: ISessionMember, content?: string }
): Promise<StepOutcome> => {
  const now: number = Date.now()
  let chatObjectId: Types.ObjectId

  if (route === 'create') {
    // A new chat has no state to check. The key check comes first, and the chat is created only
    // once it has passed, so a server with no key never holds a chat nobody could continue.
    if (!OPENAI_API_KEY) return { kind: 'notConfigured' }
    const created: any = await agentChatInterface.createLockedChat(ownerId, titleFrom(content || ''), now)
    chatObjectId = created._id
    // Ids only, never the title or the message.
    await logInterface.addLog(ownerId, 'POST AGENT CHAT', { chatId: String(chatObjectId) })
  } else {
    // 1. The chat, by the 404 rule: someone else's, deleted by the member, unknown or malformed.
    if (!chatId || !Types.ObjectId.isValid(chatId)) return { kind: 'notFound' }
    const chat: any = await agentChatInterface.findOwnLiveChat(chatId, ownerId)
    if (!chat) return { kind: 'notFound' }
    chatObjectId = chat._id

    // 2. Continue only: there must be something to continue, and the limit must not be reached.
    //    A new message is never limited: it starts the count again.
    if (route === 'continue') {
      const last: any = await agentChatInterface.findLastMessage(chatObjectId)
      if (!last || last.role === 'assistant') return conflict('nothingToContinue')
      const calls: number = await agentChatInterface.countModelCallsSinceLastUserMessage(chatObjectId)
      if (calls >= MAX_MODEL_CALLS_PER_MESSAGE) return conflict('limit')
    }

    // 3. The chat's lock, so two tabs cannot run steps on one chat at once.
    if (!(await agentChatInterface.takeStepLock(chatObjectId, ownerId, now, now - STEP_LOCK_STALE_MS))) {
      return conflict('busy')
    }

    // 4. The key. Nothing has been saved, and the lock is handed straight back.
    if (!OPENAI_API_KEY) {
      await agentChatInterface.releaseStepLock(chatObjectId, now)
      return { kind: 'notConfigured' }
    }
  }

  const saved: any[] = []
  try {
    // 5. Close out the calls the browser never reported.
    await agentChatInterface.cancelPendingToolMessages(chatObjectId, NO_RESULT_RECORDED_CONTENT, NO_RESULT_RECORDED)

    // 6. The member's message, for the routes that carry one.
    if (route !== 'continue') {
      saved.push(...await agentChatInterface.appendMessages(chatObjectId, [{ role: 'user', content, createdAt: now }]))
    }

    // 7. One model call, on the chat as it now stands. What the call sends besides the messages is
    //    stored first, each part once per chat (callRecord.ts), so a call that fails can point at
    //    it as well as one that answers.
    const history: IHistoryMessage[] = await agentChatInterface.findHistory(chatObjectId)
    const note: string = sessionNote(member, new Date())
    const tools: any[] = getTools().map(toOpenAiTool)
    const settings: IRequestSettings = requestSettings()
    const { keys, parts } = requestPartsOf({ systemPrompt: FIXED_SYSTEM_PROMPT, tools, settings })
    await agentChatInterface.addRequestParts(chatObjectId, parts)
    let completion: ICompletion
    try {
      completion = await createCompletion({
        apiKey: OPENAI_API_KEY,
        settings,
        messages: toApiMessages(history, joinSystemPrompt(FIXED_SYSTEM_PROMPT, note)),
        tools
      })
    } catch (error: any) {
      if (!(error instanceof OpenAiError)) throw error
      // The failure is kept as an `error` message, for the review page's download. It is not part
      // of the conversation: it is not returned to the browser, not sent to the model, and, like
      // before, not counted towards the limit, which counts assistant messages.
      // Recording it must not stand in the way of telling the member: a chat deleted from the
      // review page meanwhile makes appendMessages throw, and the member still gets this answer.
      await agentChatInterface.appendMessages(chatObjectId, [
        { role: 'error', createdAt: Date.now(), modelCall: failedCallRecord(keys, note, error.failure) }
      ]).catch((): void => undefined)
      if (saved.length) await agentChatInterface.touchChat(chatObjectId, Date.now())
      return { kind: 'modelFailed', message: error.message, chat: await agentChatInterface.findChatSummary(chatObjectId), messages: saved }
    }

    // 8. The answer, and one tool message per call it asked for.
    const answeredAt: number = Date.now()
    const assistant: Record<string, any> = {
      role: 'assistant',
      content: completion.content,
      openaiModel: completion.model,
      createdAt: answeredAt,
      ...(completion.usage ? { usage: completion.usage } : {}),
      ...(completion.toolCalls.length ? { toolCalls: completion.toolCalls } : {}),
      modelCall: answeredCallRecord(keys, note, completion.trace, completion.raw)
    }
    const toolMessages: Record<string, any>[] = completion.toolCalls.map((call: any): Record<string, any> => toolMessageFor(call, answeredAt))
    saved.push(...await agentChatInterface.appendMessages(chatObjectId, [assistant, ...toolMessages]))

    // 9. The token totals and updatedAt; the lock is released below, whatever happened.
    await agentChatInterface.addUsage(chatObjectId, completion.usage, answeredAt)
    return {
      kind: 'ok',
      chat: await agentChatInterface.findChatSummary(chatObjectId),
      messages: saved,
      finishReason: completion.finishReason
    }
  } finally {
    await agentChatInterface.releaseStepLock(chatObjectId, now)
  }
}

export interface IToolCallReport {
  status: ToolRunStatus
  httpStatus?: number | null
  durationMs?: number | null
  // The response body as text, as the API returned it.
  response?: string | null
  note?: string | null
}

export type ToolCallOutcome =
  | { kind: 'ok', message: any }
  | { kind: 'chatNotFound' }
  | { kind: 'toolCallNotFound' }
  | { kind: 'alreadyAnswered', message: string }

/**
 * The browser's report of one call it ran (or declined, or could not run). Never calls the model.
 *
 * Takes no lock. The only thing it changes is one pending tool message, and only while it is
 * still pending, which is checked inside the update itself.
 */
export const recordToolCallResult = async (
  { chatId, toolCallId, ownerId, report }: { chatId: string, toolCallId: string, ownerId: Types.ObjectId, report: IToolCallReport }
): Promise<ToolCallOutcome> => {
  if (!Types.ObjectId.isValid(chatId)) return { kind: 'chatNotFound' }
  const chat: any = await agentChatInterface.findOwnLiveChat(chatId, ownerId)
  if (!chat) return { kind: 'chatNotFound' }

  const toolMessage: any = await agentChatInterface.findToolMessage(chat._id, toolCallId)
  if (!toolMessage) return { kind: 'toolCallNotFound' }
  const alreadyAnswered: ToolCallOutcome = { kind: 'alreadyAnswered', message: CONFLICT_MESSAGES.alreadyAnswered }
  if (!toolMessage.run || toolMessage.run.status !== 'pending') return alreadyAnswered

  const response: string | null = typeof report.response === 'string' ? displayCopyOf(report.response) : null
  const note: string | null = typeof report.note === 'string' && report.note ? clip(report.note, MAX_NOTE_CHARS, 'cut') : null
  const content: string = modelCopyOf(report.status, { httpStatus: report.httpStatus, response: report.response, note })

  const updated: any = await agentChatInterface.recordToolResult(toolMessage._id, content, {
    status: report.status,
    httpStatus: report.httpStatus ?? null,
    durationMs: report.durationMs ?? null,
    response,
    note
  })
  if (!updated) return alreadyAnswered

  await agentChatInterface.touchChat(chat._id, Date.now())
  return { kind: 'ok', message: updated }
}
