import 'reflect-metadata'
import { Body, Controller, Delete, Get, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import { Types } from 'mongoose'
import * as messageInterface from '../db/interfaces/messageInterface'
import { IMessagePageCursor, MessagePageMode } from '../db/interfaces/messageInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IMessage } from '../db/models/Message'
import { IDonor } from '../db/models/Donor'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import messageValidator from '../validations/messages'
import { MESSAGE_PAGE_DEFAULT_LIMIT } from '../validations/validateRequest/validateQuery'
import { DESIGNATIONS_INDEX, HTTP_STATUS } from '../constants'

export interface IMessageSender {
  _id: string
  name: string
  // The batch is its first two digits, derived on the client rather than stored or sent twice.
  studentId: string
  hall: number
  designation: number
}

export interface IMessageResponseItem {
  _id: string
  text: string
  date: number
  // null when the donor record is gone. A real, expected state, not an error.
  sender: IMessageSender | null
}

export interface IGetMessagesResponse {
  status: string
  statusCode: number
  message: string
  messages: IMessageResponseItem[]
  // The watermark the client stores and hands back as `after`. NEVER the browser's own clock.
  serverTime: number
  hasMore: boolean
}

// Deleting is a race by design: two people reaching for the same message is expected, not an
// error, and both are told the same plain thing.
const ALREADY_DELETED_MESSAGE: string = 'This message has already been deleted.'
const NOT_YOUR_MESSAGE: string = 'You can only delete your own messages.'

export interface IPostMessageResponse {
  status: string
  statusCode: number
  message: string
  // The created message, ALREADY JOINED and in the same element shape GET returns, so the
  // sender can render their own bubble without a second round trip.
  sentMessage: IMessageResponseItem
}

@Route('messages')
@Tags('Messages')
export class MessagesController extends Controller {
  /**
   * One page of the member room, oldest-first.
   *
   * Three reads, one route, distinguished only by which cursor arrives:
   *
   *   (no query)                 the newest `limit` messages          first open
   *   ?after=<ms>                everything strictly newer            catch-up / fetch button / post-send
   *   ?before=<ms>&beforeId=<id> the page older than that message     scroll up
   *
   * `after` and `before` are mutually exclusive and the two halves of `before` travel
   * together; the validator refuses anything else with a 400.
   *
   * WHY `serverTime` AND NOT THE BROWSER'S CLOCK. The client stores what this response hands
   * back and sends it as the next `after`. A phone whose clock runs two minutes fast that
   * stored its own `Date.now()` would skip every message sent inside that window — a
   * data-loss bug that only ever appears on other people's devices.
   */
  @Get()
  @SuccessResponse(200, 'Messages fetched successfully')
  @Middlewares([
    messageValidator.validateGETMessages,
    // 60/minute. The fetch button is manual, but a user scrolling up fast issues one request
    // per page and must not be throttled mid-scroll.
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    // Authentication is not membership: a demoted member holds a valid designation-0 token
    // until it expires. See handleVolunteerCheck.
    authenticator.handleVolunteerCheck
  ])
  public async getMessages(
    @Request() req: any,
    @Query() after?: number,
    @Query() before?: number,
    @Query() beforeId?: string,
    @Query() limit?: number
  ): Promise<IGetMessagesResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const mode: MessagePageMode = after !== undefined ? 'after' : (before !== undefined ? 'before' : 'initial')
    const pageLimit: number = limit ?? MESSAGE_PAGE_DEFAULT_LIMIT

    // SAMPLE FIRST, THEN QUERY. The order of these two statements is the whole point: a
    // message inserted DURING the query has date > now, falls outside the `date <= now`
    // clause, and is therefore picked up by the next fetch. Sampling after the query would
    // let that message fall into the gap between the last returned row and the recorded
    // watermark, and nothing would ever ask for it again.
    const now: number = Date.now()

    const cursor: IMessagePageCursor = {
      mode,
      after,
      before,
      beforeId: beforeId === undefined ? undefined : new Types.ObjectId(beforeId),
      upperBound: now,
      limit: pageLimit
    }

    const page: { data: any[]; hasMore: boolean; message: string; status: string } =
      await messageInterface.findMessagesPage(cursor)

    // A TRUNCATED CATCH-UP MUST NOT ADVANCE THE WATERMARK PAST WHAT IT RETURNED.
    //
    // `now` is a safe watermark only when the response actually contained everything up to
    // it. It usually did. It did not when someone has been away and five hundred messages
    // arrived: the page is cut at `limit`, and a serverTime of `now` would tell the client it
    // has been shown everything up to this instant — the messages that did not fit would then
    // never be requested by anything.
    //
    // So a truncated page watermarks at its own newest row instead, and the interface has
    // already guaranteed that row does not sit inside a split millisecond.
    //
    // Only the `after` direction can advance the watermark. A `before` page is history the
    // client is scrolling back through and says nothing about what is new, and an `initial`
    // page is always the newest end — its truncation means older history exists, not that
    // catch-up is owed.
    const truncatedCatchUp: boolean = mode === 'after' && page.hasMore && page.data.length > 0
    const serverTime: number = truncatedCatchUp ? page.data[page.data.length - 1].date : now

    await logInterface.addLog(user._id, 'GET MESSAGES', { resultCount: page.data.length, mode })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Messages fetched successfully',
      messages: page.data,
      serverTime,
      hasMore: page.hasMore
    }
  }

  /**
   * Send one message to the room.
   *
   * The body is `{ text }` and nothing else. `senderId` comes from the token and `date` from
   * the schema default; a body that states either is a 400 rather than a silently ignored
   * key, because silently ignoring it is how a client comes to believe it can post as
   * somebody else or backdate a message past the reader's scroll position.
   */
  @Post()
  @SuccessResponse(201, 'Message sent successfully')
  @Middlewares([
    messageValidator.validatePOSTMessage,
    // 20/minute, its own budget. Scrolling history spends commonLimiter; talking must not
    // compete with it.
    rateLimiter.messageSendLimiter,
    authenticator.handleAuthentication,
    authenticator.handleVolunteerCheck
  ])
  public async postMessage(
    @Body() body: { text: string },
    @Request() req: any
  ): Promise<IPostMessageResponse> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const insertion: { data: IMessage; message: string; status: string } =
      await messageInterface.insertMessage(user._id, body.text)

    // Re-read through the same pipeline GET uses rather than assembling the echo by hand:
    // that is what stops a sent bubble and a fetched one from ever drifting apart.
    const joined: { data?: any; message: string; status: string } =
      await messageInterface.findJoinedMessageById(insertion.data._id as Types.ObjectId)

    // The id and the length, NOT the body. The text is already in the collection, and copying
    // it here would double the surface a Phase B4 deletion has to reach.
    await logInterface.addLog(user._id, 'POST MESSAGES', {
      messageId: String(insertion.data._id),
      length: body.text.length
    })

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Message sent successfully',
      sentMessage: joined.data
    }
  }

  /**
   * Remove one message. Its author, or a Super Admin. Nobody else — a Hall Admin has no say
   * over a room that is not scoped by hall.
   *
   * THE DELETE IS HARD AND LEAVES NO TOMBSTONE. Nobody who fetches afterwards sees any trace.
   * Someone who already had the bubble on screen keeps it until their next fetch, which given
   * the no-polling design means until they press Fetch messages, send something, or reopen the
   * app — so a stale bubble lives a session at most and never survives a restart. If a deletion
   * ever needs to be SEEN to have happened, that is a `deletedAt` column and a different plan.
   */
  @Delete()
  @SuccessResponse(200, 'Message deleted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Already deleted', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: ALREADY_DELETED_MESSAGE
  })
  @Middlewares([
    messageValidator.validateDELETEMessage,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleVolunteerCheck
  ])
  public async deleteMessage(
    @Query() messageId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // 1. GONE BEFORE "NOT YOURS". Two people deleting the same message at once is the expected
    // case; the first wins and the second is told plainly. Checking permission first would
    // report "not yours" about something that no longer exists, which leaks who wrote a
    // message that the asker can no longer see.
    const existing: { data?: IMessage; message: string; status: string } =
      await messageInterface.findMessageById(messageId)
    if (existing.status !== 'OK' || !existing.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: ALREADY_DELETED_MESSAGE }
    }

    // 2. Then permission. Author or Super Admin, and no third case.
    const isAuthor: boolean = String(existing.data.senderId) === String(user._id)
    const isSuperAdmin: boolean = user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN
    if (!isAuthor && !isSuperAdmin) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: NOT_YOUR_MESSAGE }
    }

    const deletion: { data?: IMessage; message: string; status: string } =
      await messageInterface.deleteMessageById(messageId)
    if (deletion.status !== 'OK' || !deletion.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: ALREADY_DELETED_MESSAGE }
    }

    // 3. The full text goes into the log, and only after a successful delete so a failed one
    // leaves no misleading entry. The delete is permanent for the room; this is what still
    // lets a Super Admin recover what was removed. Same bargain the feedback discard makes.
    await logInterface.addLog(user._id, 'DELETE MESSAGES', {
      messageId,
      senderId: String(deletion.data.senderId),
      text: deletion.data.text,
      date: deletion.data.date
    })

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Message deleted successfully' }
  }
}
