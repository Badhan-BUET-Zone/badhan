import 'reflect-metadata'
import { Body, Controller, Delete, Get, Middlewares, Patch, Path, Post, Put, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import { Types } from 'mongoose'
import * as agentChatInterface from '../db/interfaces/agentChatInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import authenticator from '../middlewares/authenticate'
import agentValidator from '../validations/agent'
import { DESIGNATIONS_INDEX, HTTP_STATUS } from '../constants'
import { AGENT_MODEL } from '../services/agent/constants'
import { systemPromptFor } from '../services/agent/prompt'
import { isAgentConfigured, recordToolCallResult, runStep, StepOutcome, ToolCallOutcome } from '../services/agent/step'
import { getTools } from '../services/agent/tools'

// Badhan Agent's chats, kept on the server so they follow a member from device to device.
//
// THE 404 RULE. A member reaches only their own chats that they have not deleted. Someone else's
// chat, a chat the member deleted, an id that does not exist and an id that is not an id at all
// all get the same 404 with the same message, so a caller learns nothing by trying ids. The
// ownership and the deleted flag are part of the database query (agentChatInterface), not a check
// made afterwards.
//
// NO RATE LIMITER, deliberately. One agent turn with ten tool calls makes eleven or more requests
// to these routes in under a minute, and commonLimiter's 12 per minute would cut it off midway.
//
// The JSDoc above each method is published in /openapi.json and /llms.txt, so it describes what
// the route does for the caller and nothing more. Notes for whoever maintains this file are `//`
// comments, which tsoa does not publish.
//
// Every route here is also kept away from the agent's own model: the model must never read
// another member's chats or drive its own. services/agent/tools.ts leaves every /agent route out
// of the tool list, and the browser page, while it still builds a list of its own, filters them
// out too (Agent.vue, isAgentRoute).
//
// HOW A TURN RUNS. The member's message goes to POST /agent/chats (a new chat) or …/messages. The
// backend makes one model call and returns the answer plus one tool message per API call the
// model asked for, each already turned into a request. The browser runs those requests with the
// member's own session — GETs straight away, anything else only after the member presses Send
// request — and reports each outcome to PUT …/toolCalls/{toolCallId}. With nothing left pending it
// calls …/continue for the next step. The order of one step is in services/agent/step.ts.

const CHAT_NOT_FOUND: string = 'Chat not found'

export interface IAgentChatSummary {
  _id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface IAgentMessageItem {
  _id: string
  seq: number
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: any[]
  openaiModel?: string
  usage?: any
  toolCallId?: string
  run?: any
  createdAt: number
}

interface IErrorBody {
  status: string
  statusCode: number
  message: string
}

export interface IAgentConfigResponse {
  status: string
  statusCode: number
  message: string
  // false when the server has no OpenAI key: the page then says the agent is not set up.
  configured: boolean
  model: string
  // How many API routes the assistant can call.
  toolCount: number
  // Super admins only. For every other member the field is absent, not empty.
  systemPrompt?: string
}

export interface IAgentStepResponse {
  status: string
  statusCode: number
  message: string
  // On a 409: 'busy' (another tab is running a step on this chat), 'limit' (20 model calls since
  // your last message) or 'nothingToContinue' (the last answer is finished).
  reason?: string
  chat?: IAgentChatSummary
  // The messages this request added, in order: your message (when it carried one), then the
  // assistant's answer and one tool message per API call it asked for. On a 502, only your message.
  messages?: IAgentMessageItem[]
  // 'length' means the answer was cut off at the model's output limit.
  finishReason?: string | null
}

// Who a chat belongs to, on the review page. null in its place means the donor record has since
// been deleted, and the page shows "Deleted member".
export interface IAgentReviewMember {
  _id: string
  name: string
  hall: number
  designation: number
}

export interface IAgentReviewMemberRow {
  donorId: string
  member: IAgentReviewMember | null
  // Every chat the member has, the ones they deleted included.
  chatCount: number
  deletedChatCount: number
  // The newest updatedAt among their chats.
  lastActivity: number
}

export interface IAgentReviewChat {
  _id: string
  owner: string
  title: string
  createdAt: number
  updatedAt: number
  // True when the member deleted the chat. It is kept until a super admin deletes it permanently.
  userDeletedChat: boolean
  userDeletedAt: number | null
  messageCount: number
  promptTokens: number
  completionTokens: number
}

export interface IAgentToolCallReport {
  status: 'done' | 'failed' | 'denied' | 'cancelled'
  httpStatus?: number | null
  durationMs?: number | null
  response?: string | null
  note?: string | null
}

const notFoundBody: IErrorBody = { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: CHAT_NOT_FOUND }

@Route('agent')
@Tags('Badhan Agent')
export class AgentController extends Controller {
  /**
   * List your Badhan Agent chats, newest first.
   */
  @Get('chats')
  @SuccessResponse(200, 'Chats fetched successfully')
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck
  ])
  public async getChats(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; chats: IAgentChatSummary[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const result: { data: any[]; message: string; status: string } =
      await agentChatInterface.findOwnChats(user._id as Types.ObjectId)

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Chats fetched successfully', chats: result.data }
  }

  /**
   * Open one of your Badhan Agent chats, with all its messages in order.
   */
  @Get('chats/{chatId}')
  @SuccessResponse(200, 'Chat fetched successfully')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck
  ])
  public async getChat(
    @Path() chatId: string,
    @Request() req: any
  ): Promise<IErrorBody & { chat?: IAgentChatSummary; messages?: IAgentMessageItem[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    if (!Types.ObjectId.isValid(chatId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    const result: { data?: { chat: any; messages: any[] }; message: string; status: string } =
      await agentChatInterface.findOwnChatWithMessages(chatId, user._id as Types.ObjectId)
    if (result.status !== 'OK' || !result.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Chat fetched successfully',
      chat: result.data.chat,
      messages: result.data.messages
    }
  }

  /**
   * Rename one of your Badhan Agent chats.
   */
  @Patch('chats/{chatId}')
  @SuccessResponse(200, 'Chat renamed successfully')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    // Membership before validation: a 400 to someone who may not use the route at all would
    // tell them what it accepts.
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    agentValidator.validatePATCHAgentChat
  ])
  public async renameChat(
    @Path() chatId: string,
    @Body() body: { title: string },
    @Request() req: any
  ): Promise<IErrorBody & { chat?: IAgentChatSummary }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    if (!Types.ObjectId.isValid(chatId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    // Not logged: a title is the member's own label, and the rename changes nothing else.
    const result: { data?: any; message: string; status: string } =
      await agentChatInterface.renameOwnChat(chatId, user._id as Types.ObjectId, body.title)
    if (result.status !== 'OK' || !result.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Chat renamed successfully', chat: result.data }
  }

  /**
   * Delete one of your Badhan Agent chats. It disappears from your list.
   */
  @Delete('chats/{chatId}')
  @SuccessResponse(200, 'Chat deleted successfully')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck
  ])
  public async deleteChat(
    @Path() chatId: string,
    @Request() req: any
  ): Promise<IErrorBody> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    if (!Types.ObjectId.isValid(chatId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    // A SOFT delete: userDeletedChat and userDeletedAt are set, and the chat and its messages stay
    // in the database until a super admin deletes it permanently from the review page. The member
    // is not told, which is why the description above stops at "it disappears from your list" —
    // that description is published.
    const result: { data?: any; message: string; status: string } =
      await agentChatInterface.softDeleteOwnChat(chatId, user._id as Types.ObjectId)
    if (result.status !== 'OK' || !result.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    // Ids only, never the title or any message text.
    await logInterface.addLog(user._id, 'DELETE AGENT CHAT', { chatId })

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Chat deleted successfully' }
  }

  /**
   * Find out whether Badhan Agent is set up on this server
   * Answers whether the server can make model calls (`configured`), which model it uses, and how
   * many API routes the assistant can call.
   */
  @Get('config')
  @SuccessResponse(200, 'Agent configuration fetched successfully')
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck
  ])
  public async getConfig(
    @Request() req: any
  ): Promise<IAgentConfigResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const body: IAgentConfigResponse = {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Agent configuration fetched successfully',
      configured: isAgentConfigured(),
      model: AGENT_MODEL,
      toolCount: getTools().length
    }
    // The system prompt, with the caller's own session note, for the read-only panel. Super admins
    // only, and for everyone else the field is left out entirely rather than sent empty.
    if (user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN) {
      body.systemPrompt = systemPromptFor(user)
    }

    this.setStatus(HTTP_STATUS.OK)
    return body
  }

  /**
   * Start a Badhan Agent chat with your first message
   * Creates the chat and makes one model call. Answers 201 with the chat, your message, the
   * assistant's answer and one tool message per API call it asked for. 503 when the agent is not
   * set up on this server; 502 when the model call fails, in which case the chat and your message
   * are kept and POST /agent/chats/{chatId}/continue retries.
   */
  @Post('chats')
  @SuccessResponse(201, 'Chat created')
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    agentValidator.validatePOSTAgentContent
  ])
  public async postChat(
    @Body() body: { content: string },
    @Request() req: any
  ): Promise<IAgentStepResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const outcome: StepOutcome = await runStep({ route: 'create', ownerId: user._id as Types.ObjectId, member: user, content: body.content })
    return this.answerStep(outcome, HTTP_STATUS.CREATED, 'Chat created')
  }

  /**
   * Send a message in one of your Badhan Agent chats
   * Saves your message and makes one model call. Any API call from the previous answer that was
   * never reported is closed out as cancelled first.
   */
  @Post('chats/{chatId}/messages')
  @SuccessResponse(200, 'Message answered')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    agentValidator.validatePOSTAgentContent
  ])
  public async postMessage(
    @Path() chatId: string,
    @Body() body: { content: string },
    @Request() req: any
  ): Promise<IAgentStepResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const outcome: StepOutcome = await runStep({ route: 'message', chatId, ownerId: user._id as Types.ObjectId, member: user, content: body.content })
    return this.answerStep(outcome, HTTP_STATUS.OK, 'Message answered')
  }

  /**
   * Let the assistant carry on in one of your Badhan Agent chats
   * Makes one model call on the chat as it stands, with no new message: the next step once every
   * API call from the last answer has been reported, or a retry after a failed model call. 409
   * when the last answer is finished, or after 20 model calls since your last message.
   */
  @Post('chats/{chatId}/continue')
  @SuccessResponse(200, 'Step answered')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    agentValidator.validatePOSTAgentContinue
  ])
  public async postContinue(
    @Path() chatId: string,
    @Request() req: any
  ): Promise<IAgentStepResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const outcome: StepOutcome = await runStep({ route: 'continue', chatId, ownerId: user._id as Types.ObjectId, member: user })
    return this.answerStep(outcome, HTTP_STATUS.OK, 'Step answered')
  }

  /**
   * Report the result of one API call the assistant asked for
   * `status` is done (the API answered, with any HTTP status), failed (no answer), denied (you
   * declined it) or cancelled. `response` is the response body as text. A call's result can be
   * reported once; a second report answers 409. Does not call the model.
   */
  @Put('chats/{chatId}/toolCalls/{toolCallId}')
  @SuccessResponse(200, 'Tool call result recorded')
  @Response<IErrorBody>(404, 'Chat or tool call not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    agentValidator.validatePUTAgentToolCall
  ])
  public async putToolCall(
    @Path() chatId: string,
    @Path() toolCallId: string,
    @Body() body: IAgentToolCallReport,
    @Request() req: any
  ): Promise<IErrorBody & { reason?: string; toolMessage?: IAgentMessageItem }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const outcome: ToolCallOutcome = await recordToolCallResult({
      chatId,
      toolCallId,
      ownerId: user._id as Types.ObjectId,
      report: body
    })

    if (outcome.kind === 'chatNotFound') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }
    if (outcome.kind === 'toolCallNotFound') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Tool call not found' }
    }
    if (outcome.kind === 'alreadyAnswered') {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: outcome.message, reason: 'alreadyAnswered' }
    }

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Tool call result recorded', toolMessage: outcome.message }
  }

  // ─── The review page: super admins only ─────────────────────────────────────────────────────
  //
  // These read and delete every member's chats, including the ones members deleted. A super
  // admin reads other members' chats here and only here: on the member routes above, someone
  // else's chat is a 404 for a super admin as for anyone. There is no route that lets a super
  // admin continue another member's chat.

  /**
   * List every member who has Badhan Agent chats (Super Admin only)
   * Counts chats the member deleted, so a member stays listed until their last chat is deleted
   * permanently. Most recent activity first. `member` is null when the donor record has been
   * deleted.
   */
  @Get('review/members')
  @SuccessResponse(200, 'Members fetched successfully')
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    authenticator.handleSuperAdminCheck
  ])
  public async getReviewMembers(): Promise<{ status: string; statusCode: number; message: string; members: IAgentReviewMemberRow[] }> {
    const members: any[] = await agentChatInterface.findReviewMembers()
    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Members fetched successfully', members }
  }

  /**
   * List one member's Badhan Agent chats, deleted ones included (Super Admin only)
   * Newest first, each with whether the member deleted it and when, its message count and its
   * token totals. `member` is null when the donor record has been deleted.
   */
  @Get('review/members/{donorId}/chats')
  @SuccessResponse(200, 'Chats fetched successfully')
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    authenticator.handleSuperAdminCheck,
    agentValidator.validateGETAgentReviewMemberChats
  ])
  public async getReviewMemberChats(
    @Path() donorId: string
  ): Promise<{ status: string; statusCode: number; message: string; member: IAgentReviewMember | null; chats: IAgentReviewChat[] }> {
    const result: { member: any, chats: any[] } =
      await agentChatInterface.findReviewMemberChats(new Types.ObjectId(donorId))
    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Chats fetched successfully', member: result.member, chats: result.chats }
  }

  /**
   * Read any member's Badhan Agent chat (Super Admin only)
   * The whole transcript, whoever owns the chat and whether or not they deleted it. Opening one is
   * recorded in App Activity.
   */
  @Get('review/chats/{chatId}')
  @SuccessResponse(200, 'Chat fetched successfully')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    authenticator.handleSuperAdminCheck
  ])
  public async getReviewChat(
    @Path() chatId: string,
    @Request() req: any
  ): Promise<IErrorBody & { chat?: IAgentReviewChat; member?: IAgentReviewMember | null; messages?: IAgentMessageItem[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    if (!Types.ObjectId.isValid(chatId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }
    const result: { chat: any, member: any, messages: any[] } | null = await agentChatInterface.findReviewChat(chatId)
    if (!result) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    // Reading another member's conversation is itself recorded, like opening the Activity
    // Summary. Ids only, never the title or any message text.
    await logInterface.addLog(user._id, 'GET AGENT CHAT (REVIEW)', { chatId, ownerId: String(result.chat.owner) })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Chat fetched successfully',
      chat: result.chat,
      member: result.member,
      messages: result.messages
    }
  }

  /**
   * Delete a member's Badhan Agent chat permanently (Super Admin only)
   * Removes the chat and all its messages for good; it cannot be undone. Works whether or not the
   * member had already deleted it.
   */
  @Delete('review/chats/{chatId}')
  @SuccessResponse(200, 'Chat deleted permanently')
  @Response<IErrorBody>(404, 'Chat not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: CHAT_NOT_FOUND
  })
  @Middlewares([
    authenticator.handleAuthentication,
    authenticator.handleAgentVolunteerCheck,
    authenticator.handleSuperAdminCheck
  ])
  public async deleteReviewChat(
    @Path() chatId: string,
    @Request() req: any
  ): Promise<IErrorBody> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    if (!Types.ObjectId.isValid(chatId)) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }
    const result: { owner: Types.ObjectId, deletedMessageCount: number } | null =
      await agentChatInterface.deleteChatPermanently(chatId)
    if (!result) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return notFoundBody
    }

    // Logged only after it happened, so a failed delete leaves no misleading entry. The title and
    // the transcript are gone for good; this row is the only trace, and it carries ids and a count.
    await logInterface.addLog(user._id, 'DELETE AGENT CHAT PERMANENTLY', {
      chatId,
      ownerId: String(result.owner),
      messageCount: result.deletedMessageCount
    })

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Chat deleted permanently' }
  }

  // One step's outcome as an HTTP answer. Not a route: tsoa registers only decorated methods.
  private answerStep(outcome: StepOutcome, okStatus: number, okMessage: string): IAgentStepResponse {
    switch (outcome.kind) {
      case 'ok':
        this.setStatus(okStatus)
        return {
          status: 'OK',
          statusCode: okStatus,
          message: okMessage,
          chat: outcome.chat,
          messages: outcome.messages,
          finishReason: outcome.finishReason
        }
      case 'notFound':
        this.setStatus(HTTP_STATUS.NOT_FOUND)
        return notFoundBody
      case 'conflict':
        this.setStatus(HTTP_STATUS.CONFLICT)
        return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: outcome.message, reason: outcome.reason }
      case 'notConfigured':
        this.setStatus(HTTP_STATUS.SERVICE_UNAVAILABLE)
        return { status: 'ERROR', statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'The agent is not set up on this server.' }
      case 'modelFailed':
        this.setStatus(HTTP_STATUS.BAD_GATEWAY)
        return {
          status: 'ERROR',
          statusCode: HTTP_STATUS.BAD_GATEWAY,
          message: outcome.message,
          chat: outcome.chat,
          messages: outcome.messages
        }
    }
  }
}
