import { PipelineStage, Types } from 'mongoose'
import { MessageModel, IMessage } from '../models/Message'

/**
 * The chat's data access, in the { data, message, status } shape every other interface here
 * uses.
 */

export const insertMessage = async (
  senderId: Types.ObjectId,
  text: string
): Promise<{ data: IMessage, message: string, status: string }> => {
  // `date` is left to the schema default rather than passed in: the send time is the
  // server's to decide, and a caller-supplied one is a cursor ordering the client controls.
  const messageDoc: IMessage = new MessageModel({ senderId, text })
  const data: IMessage = await messageDoc.save()
  return {
    data,
    message: 'Message insertion successful',
    status: 'OK'
  }
}

export const findMessageById = async (
  messageId: string
): Promise<{ data?: IMessage, message: string, status: string }> => {
  const data: IMessage | null = await MessageModel.findOne({ _id: messageId })
  if (data) {
    return {
      data,
      message: 'Message fetched successfully',
      status: 'OK'
    }
  }
  return {
    message: 'Message not found',
    status: 'ERROR'
  }
}

export const deleteMessageById = async (
  messageId: string
): Promise<{ data?: IMessage, message: string, status: string }> => {
  const data: IMessage | null = await MessageModel.findByIdAndDelete(messageId)
  if (data) {
    return {
      data,
      message: 'Message removed successfully',
      status: 'OK'
    }
  }
  return {
    message: 'Could not remove message',
    status: 'ERROR'
  }
}

/**
 * The sender, reduced to what a chat bubble can do with one.
 *
 * An INCLUSION projection on purpose. The search pipeline uses an exclusion list, which leaks
 * any field added to the Donor schema later; here a new field is invisible until somebody
 * names it — which is why `password`, `email` and `address` are absent and cannot drift back.
 *
 * `phone` is absent DELIBERATELY, not by oversight. The chat is not a directory; a member's
 * number is one tap away through the existing search, where it is already permissioned.
 *
 * `studentId` is here because the batch is its first two digits — derived on the client
 * rather than stored or computed twice.
 */
const senderSummaryProjection: PipelineStage.Lookup['$lookup']['pipeline'] = [
  {
    $project: {
      _id: 1,
      name: 1,
      studentId: 1,
      hall: 1,
      designation: 1
    }
  }
]

export type MessagePageMode = 'initial' | 'after' | 'before'

export interface IMessagePageCursor {
  mode: MessagePageMode
  // `after` mode only. Exclusive on the timestamp ALONE and needing no _id tiebreak: this is
  // always a serverTime the client was previously handed, and that response already returned
  // everything with date <= it. The cursor points at an instant, so an instant is all it needs.
  after?: number
  // `before` mode only, and always as a pair. The cursor points at a MESSAGE.
  before?: number
  beforeId?: Types.ObjectId
  // Sampled by the caller BEFORE this query runs, so a message inserted mid-query falls
  // outside it and is picked up by the next fetch instead of vanishing into the watermark gap.
  upperBound: number
  limit: number
}

/**
 * Build the keyset filter. The two directions are asymmetric, and deliberately so.
 */
const buildCursorFilter = (cursor: IMessagePageCursor): Record<string, any> => {
  if (cursor.mode === 'after') {
    return { date: { $gt: cursor.after, $lte: cursor.upperBound } }
  }
  if (cursor.mode === 'before') {
    // A plain { date: { $lt: before } } looks fine and is wrong: if the oldest message on the
    // current page shares its millisecond with one that did not fit, that other message is
    // skipped forever and the user scrolling up never learns it existed. Two people pressing
    // send at the same moment during a blood-drive push is exactly when this happens.
    return {
      date: { $lte: cursor.upperBound },
      $or: [
        { date: { $lt: cursor.before } },
        { date: cursor.before, _id: { $lt: cursor.beforeId } }
      ]
    }
  }
  return { date: { $lte: cursor.upperBound } }
}

/**
 * Run the page, cutting BEFORE the join.
 *
 * The $lookup runs on every read because sender details are resolved live, so it must see the
 * page and not the collection — hence $limit above $lookup rather than below it.
 *
 * The internal sort direction differs by mode, and that is load-bearing rather than tidy:
 *
 *  - `after` sorts ASCENDING, so the rows kept are the ones immediately following the
 *    watermark and the page is contiguous with what the client already holds. A descending
 *    cut here would hand back the NEWEST rows of the gap and leave a hole in the middle that
 *    the advancing watermark then closes over permanently.
 *  - `initial` and `before` sort DESCENDING, because they want the newest end.
 *
 * The index { date: -1, _id: -1 } serves both: an ascending sort walks it backwards. No
 * second index is needed.
 *
 * Every mode hands back OLDEST-FIRST, so the frontend never reverses an array and the two
 * directions differ only in which end of the list they splice onto.
 */
const runPage = async (match: Record<string, any>, ascending: boolean, fetchCount?: number): Promise<any[]> => {
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: ascending ? { date: 1, _id: 1 } : { date: -1, _id: -1 } },
    ...(fetchCount === undefined ? [] : [{ $limit: fetchCount }]),
    {
      $lookup: {
        from: 'donors',
        localField: 'senderId',
        foreignField: '_id',
        pipeline: senderSummaryProjection,
        as: 'senderMatches'
      }
    },
    // A deleted donor is a real, expected state and not an error: the row survives its sender
    // and the frontend renders it as a former member.
    { $addFields: { sender: { $ifNull: [{ $arrayElemAt: ['$senderMatches', 0] }, null] } } },
    { $project: { _id: 1, text: 1, date: 1, sender: 1 } },
    { $sort: { date: 1, _id: 1 } }
  ]
  return MessageModel.aggregate(pipeline)
}

/**
 * One page of the room, oldest-first, with `hasMore` meaning "more exists in the direction
 * you asked for" — catch-up still waiting in `after` mode, older history in the other two.
 *
 * `hasMore` is the limit + 1 probe coming back, never a second countDocuments.
 */
export const findMessagesPage = async (
  cursor: IMessagePageCursor
): Promise<{ data: any[], hasMore: boolean, message: string, status: string }> => {
  const rows: any[] = await runPage(buildCursorFilter(cursor), cursor.mode === 'after', cursor.limit + 1)
  const truncated: boolean = rows.length > cursor.limit

  if (!truncated) {
    return { data: rows, hasMore: false, message: 'Messages fetched successfully', status: 'OK' }
  }

  // Rows are oldest-first, so the probe row sits at whichever end the mode did NOT want:
  // `after` wanted the oldest of the gap and keeps the front; the other two wanted the
  // newest and keep the back.
  let page: any[] = cursor.mode === 'after'
    ? rows.slice(0, cursor.limit)
    : rows.slice(rows.length - cursor.limit)

  if (cursor.mode === 'after') {
    // The caller uses the last returned `date` verbatim as the next `after`, and `after` is
    // exclusive on the timestamp alone — so a cut landing between two messages that share a
    // millisecond would drop the second one. Never split a millisecond: drop trailing rows
    // until the last kept row's date differs from the first discarded row's.
    const firstDiscardedDate: number = rows[cursor.limit].date
    while (page.length > 0 && page[page.length - 1].date === firstDiscardedDate) {
      page = page.slice(0, page.length - 1)
    }

    // Degenerate case: every row in the page shares one millisecond, so trimming emptied it.
    // Returning nothing with hasMore would be a client that can never advance, and cutting
    // anyway would drop the rest of that millisecond forever. So return that millisecond
    // whole, over the limit — bounded by however many messages truly share one instant.
    if (page.length === 0) {
      const wholeMillisecond: any[] = await runPage({ date: firstDiscardedDate }, true)
      return {
        data: wholeMillisecond,
        hasMore: true,
        message: 'Messages fetched successfully',
        status: 'OK'
      }
    }
  }

  return { data: page, hasMore: true, message: 'Messages fetched successfully', status: 'OK' }
}

/**
 * One message in the exact element shape GET returns, sender joined.
 *
 * Exists so POST can answer 201 with a renderable bubble and the client needs no second round
 * trip. It reuses runPage rather than projecting by hand, which is what keeps the sent message
 * and the fetched one from ever drifting apart — including `sender: null`, and including any
 * field the projection gains later.
 */
export const findJoinedMessageById = async (
  messageId: Types.ObjectId
): Promise<{ data?: any, message: string, status: string }> => {
  const rows: any[] = await runPage({ _id: messageId }, true, 1)
  if (rows.length === 0) {
    return { message: 'Message not found', status: 'ERROR' }
  }
  return { data: rows[0], message: 'Message fetched successfully', status: 'OK' }
}
