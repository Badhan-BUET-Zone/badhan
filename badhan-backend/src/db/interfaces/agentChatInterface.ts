import { Types } from 'mongoose'
import { AgentChatModel, IAgentChat } from '../models/AgentChat'
import { AgentMessageModel } from '../models/AgentMessage'
import { DonorModel } from '../models/Donor'

/**
 * Badhan Agent chats, in the { data, message, status } shape every other interface here uses.
 *
 * Every member-facing function takes the caller's donor id and puts it IN THE QUERY, together
 * with `userDeletedChat: false`. Someone else's chat and a chat the member deleted therefore
 * match nothing, exactly like an id that does not exist, and the route answers all three with
 * the same 404 — so chat ids cannot be probed.
 */

// What a member's own list and a chat header carry. An INCLUSION projection on purpose: the
// deleted flag, the token totals and the lock are not the member's to see, and a field added to
// the schema later stays invisible here until somebody names it.
const OWN_CHAT_SUMMARY_PROJECTION: Record<string, 1> = {
  _id: 1,
  title: 1,
  createdAt: 1,
  updatedAt: 1
}

// The messages that make up the conversation. A failed model call is kept as an `error` message
// for the review page's download, and every transcript and the model's own history leave it out.
const CONVERSATION_ROLES: Record<string, any> = { $ne: 'error' }

// A message as the transcript shows it. `chatId` is left out because the caller already has it,
// and `modelCall` because it is for the download only.
const MESSAGE_PROJECTION: Record<string, 1> = {
  _id: 1,
  seq: 1,
  role: 1,
  content: 1,
  toolCalls: 1,
  openaiModel: 1,
  usage: 1,
  toolCallId: 1,
  run: 1,
  createdAt: 1
}

const ownLiveChatFilter = (chatId: string, ownerId: Types.ObjectId): Record<string, any> => ({
  _id: new Types.ObjectId(chatId),
  owner: ownerId,
  userDeletedChat: false
})

export const findOwnChats = async (
  ownerId: Types.ObjectId
): Promise<{ data: any[], message: string, status: string }> => {
  // Served by the { owner, userDeletedChat, updatedAt } index, sort included.
  const data: any[] = await AgentChatModel.find(
    { owner: ownerId, userDeletedChat: false },
    OWN_CHAT_SUMMARY_PROJECTION
  ).sort({ updatedAt: -1, _id: -1 }).lean()
  return { data, message: 'Chats fetched successfully', status: 'OK' }
}

/**
 * The caller's chat and all its messages in order, or ERROR when the chat is not theirs to see.
 * `chatId` must already be a valid ObjectId string; the controller checks that first.
 */
export const findOwnChatWithMessages = async (
  chatId: string,
  ownerId: Types.ObjectId
): Promise<{ data?: { chat: any, messages: any[] }, message: string, status: string }> => {
  const chat: any = await AgentChatModel.findOne(ownLiveChatFilter(chatId, ownerId), OWN_CHAT_SUMMARY_PROJECTION).lean()
  if (!chat) {
    return { message: 'Chat not found', status: 'ERROR' }
  }
  const messages: any[] = await AgentMessageModel.find({ chatId: chat._id, role: CONVERSATION_ROLES }, MESSAGE_PROJECTION)
    .sort({ seq: 1 }).lean()
  return { data: { chat, messages }, message: 'Chat fetched successfully', status: 'OK' }
}

/**
 * Renaming leaves `updatedAt` alone. It is the time the conversation itself last moved, and the
 * member's list is ordered by it, so a rename does not jump a chat to the top.
 */
export const renameOwnChat = async (
  chatId: string,
  ownerId: Types.ObjectId,
  title: string
): Promise<{ data?: any, message: string, status: string }> => {
  const data: any = await AgentChatModel.findOneAndUpdate(
    ownLiveChatFilter(chatId, ownerId),
    { $set: { title } },
    { new: true, runValidators: true, projection: OWN_CHAT_SUMMARY_PROJECTION }
  ).lean()
  if (!data) {
    return { message: 'Chat not found', status: 'ERROR' }
  }
  return { data, message: 'Chat renamed successfully', status: 'OK' }
}

/**
 * The member's delete: a SOFT delete. The chat leaves their list on every device, and it and its
 * messages stay in the database until a super admin deletes it permanently.
 *
 * The filter includes `userDeletedChat: false`, so deleting twice is a 404 the second time rather
 * than a second, later `userDeletedAt` overwriting the first.
 */
export const softDeleteOwnChat = async (
  chatId: string,
  ownerId: Types.ObjectId
): Promise<{ data?: IAgentChat, message: string, status: string }> => {
  const data: IAgentChat | null = await AgentChatModel.findOneAndUpdate(
    ownLiveChatFilter(chatId, ownerId),
    { $set: { userDeletedChat: true, userDeletedAt: Date.now() } },
    { new: true }
  )
  if (!data) {
    return { message: 'Chat not found', status: 'ERROR' }
  }
  return { data, message: 'Chat deleted successfully', status: 'OK' }
}

// ─── The building blocks of one agent step ──────────────────────────────────────────────────
//
// Used only by services/agent/step.ts, which runs them in the order the plan fixes. Plain return
// values rather than the { data, message, status } envelope: none of them is a route's answer,
// and each one's "nothing found" is a decision the step makes, not an error.

// A chat summary as the member's own routes show it.
export const findChatSummary = async (chatId: Types.ObjectId): Promise<any> =>
  AgentChatModel.findById(chatId, OWN_CHAT_SUMMARY_PROJECTION).lean()

// The caller's own live chat, or null — the same 404 rule as every member route.
export const findOwnLiveChat = async (chatId: string, ownerId: Types.ObjectId): Promise<any> =>
  AgentChatModel.findOne(ownLiveChatFilter(chatId, ownerId), { _id: 1, stepStartedAt: 1 }).lean()

/**
 * A new chat, created already holding its own step lock: its first step starts the moment it
 * exists, and nothing else may run a step on it meanwhile.
 */
export const createLockedChat = async (ownerId: Types.ObjectId, title: string, now: number): Promise<IAgentChat> =>
  AgentChatModel.create({ owner: ownerId, title, createdAt: now, updatedAt: now, stepStartedAt: now })

/**
 * Take the chat's step lock: set `stepStartedAt`, but only when it is empty or older than
 * `staleBefore`. One atomic update, so two tabs asking at once cannot both get it. Returns false
 * when another step holds it.
 *
 * `matchedCount` rather than `modifiedCount`: the filter IS the lock condition.
 */
export const takeStepLock = async (
  chatId: Types.ObjectId,
  ownerId: Types.ObjectId,
  now: number,
  staleBefore: number
): Promise<boolean> => {
  const result: { matchedCount: number } = await AgentChatModel.updateOne(
    {
      _id: chatId,
      owner: ownerId,
      userDeletedChat: false,
      $or: [{ stepStartedAt: null }, { stepStartedAt: { $lt: staleBefore } }]
    },
    { $set: { stepStartedAt: now } }
  )
  return result.matchedCount === 1
}

/**
 * Release the lock, but only if it is still the one this step took. A step that ran past the
 * stale limit may have had its lock taken over by another, and must not free that one.
 */
export const releaseStepLock = async (chatId: Types.ObjectId, lockValue: number): Promise<void> => {
  await AgentChatModel.updateOne({ _id: chatId, stepStartedAt: lockValue }, { $set: { stepStartedAt: null } })
}

// The newest message of the conversation, or null for a chat with none.
export const findLastMessage = async (chatId: Types.ObjectId): Promise<any> =>
  AgentMessageModel.findOne({ chatId, role: CONVERSATION_ROLES }, { role: 1, seq: 1 }).sort({ seq: -1 }).lean()

// How many model calls the chat has made since the member last wrote. Each model call that
// answered saves exactly one assistant message; a failed one saves an `error` message, which does
// not count.
export const countModelCallsSinceLastUserMessage = async (chatId: Types.ObjectId): Promise<number> => {
  const lastUser: any = await AgentMessageModel.findOne({ chatId, role: 'user' }, { seq: 1 }).sort({ seq: -1 }).lean()
  return AgentMessageModel.countDocuments({ chatId, role: 'assistant', seq: { $gt: lastUser ? lastUser.seq : -1 } })
}

/**
 * Close out every tool call still pending: the browser never reported it, and the chat is moving
 * on. `$set` on the dotted paths, never a loaded document mutated in place: `run` is Mixed, and
 * mongoose does not notice changes inside a Mixed value.
 */
export const cancelPendingToolMessages = async (chatId: Types.ObjectId, content: string, note: string): Promise<void> => {
  await AgentMessageModel.updateMany(
    { chatId, role: 'tool', 'run.status': 'pending' },
    { $set: { content, 'run.status': 'cancelled', 'run.note': note } }
  )
}

// The whole chat in order, as much of each message as the model's history needs.
export const findHistory = async (chatId: Types.ObjectId): Promise<any[]> =>
  AgentMessageModel.find({ chatId, role: CONVERSATION_ROLES }, { role: 1, content: 1, toolCalls: 1, toolCallId: 1 }).sort({ seq: 1 }).lean()

/**
 * Store what a model call sends besides the messages (services/agent/callRecord.ts), each part
 * only if the chat does not hold it yet: the filter makes an unchanged part a no-op, so the 20 KB
 * tools list is written once per version, not once per call.
 */
export const addRequestParts = async (chatId: Types.ObjectId, parts: Record<string, any>): Promise<void> => {
  await Promise.all(Object.entries(parts).map(([key, value]: [string, any]): Promise<any> => AgentChatModel.updateOne(
    { _id: chatId, [`requestParts.${key}`]: { $exists: false } },
    { $set: { [`requestParts.${key}`]: value } }
  )))
}

/**
 * Append messages to the end of the chat, in order, and return them as the transcript shows them.
 *
 * The positions are claimed with one atomic `$inc` on the chat's `messageCount`, so they are
 * contiguous and never reused. The unique { chatId, seq } index is the backstop.
 */
export const appendMessages = async (chatId: Types.ObjectId, messages: Record<string, any>[]): Promise<any[]> => {
  if (messages.length === 0) return []
  const before: any = await AgentChatModel.findOneAndUpdate(
    { _id: chatId },
    { $inc: { messageCount: messages.length } },
    { new: false, projection: { messageCount: 1 } }
  ).lean()
  // A super admin can delete a chat permanently from the review page while one of the member's
  // steps is still running on it. Write nothing into a chat that is gone.
  if (!before) throw new Error('The chat was deleted while a step was running on it')
  const firstSeq: number = before.messageCount
  const inserted: any[] = await AgentMessageModel.insertMany(
    messages.map((message: Record<string, any>, index: number): Record<string, any> => ({ ...message, chatId, seq: firstSeq + index }))
  )
  // Read back through the transcript's own projection, so what a step returns and what opening
  // the chat returns can never drift apart.
  return AgentMessageModel.find({ _id: { $in: inserted.map((m: any): Types.ObjectId => m._id) } }, MESSAGE_PROJECTION)
    .sort({ seq: 1 }).lean()
}

// The conversation moved: it goes to the top of the member's list.
export const touchChat = async (chatId: Types.ObjectId, now: number): Promise<void> => {
  await AgentChatModel.updateOne({ _id: chatId }, { $set: { updatedAt: now } })
}

// Add one model call's tokens to the chat's running totals, which the review page shows.
export const addUsage = async (
  chatId: Types.ObjectId,
  usage: { prompt_tokens?: number, completion_tokens?: number } | null,
  now: number
): Promise<void> => {
  const promptTokens: number = Number.isInteger(usage?.prompt_tokens) ? usage!.prompt_tokens! : 0
  const completionTokens: number = Number.isInteger(usage?.completion_tokens) ? usage!.completion_tokens! : 0
  await AgentChatModel.updateOne(
    { _id: chatId },
    { $inc: { promptTokens, completionTokens }, $set: { updatedAt: now } }
  )
}

// One tool message by the id of the call it answers.
export const findToolMessage = async (chatId: Types.ObjectId, toolCallId: string): Promise<any> =>
  AgentMessageModel.findOne({ chatId, role: 'tool', toolCallId }, { _id: 1, run: 1 }).lean()

/**
 * Record a call's outcome, but only if it is still pending: a result can be recorded once. The
 * condition is in the update itself, so a report racing a step that is cancelling the call cannot
 * overwrite the cancellation. Returns the updated message, or null when it was no longer pending.
 */
export const recordToolResult = async (
  messageId: Types.ObjectId,
  content: string,
  run: Record<string, any>
): Promise<any> => {
  const set: Record<string, any> = { content }
  for (const [key, value] of Object.entries(run)) set[`run.${key}`] = value
  return AgentMessageModel.findOneAndUpdate(
    { _id: messageId, 'run.status': 'pending' },
    { $set: set },
    { new: true, projection: MESSAGE_PROJECTION }
  ).lean()
}

// ─── The review page: super admins only ─────────────────────────────────────────────────────
//
// Unlike everything above, these read EVERY member's chats, including the ones members deleted.
// The routes that call them check for a super admin; nothing here does.

// Who a chat belongs to, looked up from Donors when read and never copied onto the chat. Three
// fields and no more: the review page has no use for a phone number or an address.
const REVIEW_MEMBER_PROJECTION: Record<string, 1> = {
  _id: 1,
  name: 1,
  hall: 1,
  designation: 1
}

// A chat as the review page shows it: everything but the step lock and the model calls' parts.
const REVIEW_CHAT_PROJECTION: Record<string, 1> = {
  _id: 1,
  owner: 1,
  title: 1,
  createdAt: 1,
  updatedAt: 1,
  userDeletedChat: 1,
  userDeletedAt: 1,
  messageCount: 1,
  promptTokens: 1,
  completionTokens: 1
}

// The owner's donor record, or null when it has since been deleted: the page shows that chat
// under "Deleted member" rather than under a name that no longer exists.
const findMember = async (donorId: Types.ObjectId): Promise<any> =>
  DonorModel.findById(donorId, REVIEW_MEMBER_PROJECTION).lean()

/**
 * Every member with at least one chat, counting chats they deleted, with how many they have, how
 * many of those they deleted, and when the last one moved. Most recent activity first.
 *
 * Grouped in the database and joined only after, so the join runs once per member, not per chat.
 * The group reads the whole collection; there is deliberately no paging, because the organisation
 * has hundreds of members, not tens of thousands.
 */
export const findReviewMembers = async (): Promise<any[]> =>
  AgentChatModel.aggregate([
    {
      $group: {
        _id: '$owner',
        chatCount: { $sum: 1 },
        deletedChatCount: { $sum: { $cond: ['$userDeletedChat', 1, 0] } },
        lastActivity: { $max: '$updatedAt' }
      }
    },
    { $sort: { lastActivity: -1, _id: 1 } },
    {
      $lookup: {
        from: 'donors',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: REVIEW_MEMBER_PROJECTION }],
        as: 'memberMatches'
      }
    },
    {
      $project: {
        _id: 0,
        donorId: '$_id',
        member: { $ifNull: [{ $arrayElemAt: ['$memberMatches', 0] }, null] },
        chatCount: 1,
        deletedChatCount: 1,
        lastActivity: 1
      }
    }
  ])

// One member's chats, deleted ones included, newest first, and who the member is.
export const findReviewMemberChats = async (donorId: Types.ObjectId): Promise<{ member: any, chats: any[] }> => {
  const [member, chats]: [any, any[]] = await Promise.all([
    findMember(donorId),
    AgentChatModel.find({ owner: donorId }, REVIEW_CHAT_PROJECTION).sort({ updatedAt: -1, _id: -1 }).lean()
  ])
  return { member, chats }
}

// Any chat's whole transcript, whoever owns it and whether or not they deleted it. Null when there
// is no such chat.
export const findReviewChat = async (chatId: string): Promise<{ chat: any, member: any, messages: any[] } | null> => {
  const chat: any = await AgentChatModel.findById(chatId, REVIEW_CHAT_PROJECTION).lean()
  if (!chat) return null
  const [member, messages]: [any, any[]] = await Promise.all([
    findMember(chat.owner),
    AgentMessageModel.find({ chatId: chat._id, role: CONVERSATION_ROLES }, MESSAGE_PROJECTION).sort({ seq: 1 }).lean()
  ])
  return { chat, member, messages }
}

/**
 * A chat and every one of its messages EXACTLY as stored, for the review page's download, which
 * is for debugging. Deliberately NO projection and no role filter, unlike everything above: the
 * step lock, the model calls' parts, each message's chatId and model call record, the failed calls
 * kept as `error` messages, and any field a later schema adds (or an old document still carries)
 * are all in it without anybody naming them. The owner's donor record is looked up as
 * findReviewChat does and returned beside the chat, never merged into it. Null when there is no
 * such chat.
 */
export const findChatAsStored = async (chatId: string): Promise<{ chat: any, member: any, messages: any[] } | null> => {
  const chat: any = await AgentChatModel.findById(chatId).lean()
  if (!chat) return null
  const [member, messages]: [any, any[]] = await Promise.all([
    findMember(chat.owner),
    AgentMessageModel.find({ chatId: chat._id }).sort({ seq: 1 }).lean()
  ])
  return { chat, member, messages }
}

/**
 * A super admin's delete: PERMANENT. The messages go first and then the chat, so a delete that
 * fails half way leaves a chat with fewer messages, never messages with no chat. Null when there
 * was no such chat.
 */
export const deleteChatPermanently = async (chatId: string): Promise<{ owner: Types.ObjectId, deletedMessageCount: number } | null> => {
  const chat: any = await AgentChatModel.findById(chatId, { owner: 1 }).lean()
  if (!chat) return null
  const deletedMessages: { deletedCount: number } = await AgentMessageModel.deleteMany({ chatId: chat._id })
  const deletedChat: { deletedCount: number } = await AgentChatModel.deleteOne({ _id: chat._id })
  if (deletedChat.deletedCount !== 1) return null
  return { owner: chat.owner, deletedMessageCount: deletedMessages.deletedCount }
}
