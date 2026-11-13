import { Schema, model, Model, Document, Types } from 'mongoose'
import { checkNumber, checkNullableTimeStamp, checkTimeStamp } from './validators'

// A rename may be this long. The title the server writes from the first message is shorter (60
// characters), and the route enforces the real rule; this is the backstop.
export const AGENT_CHAT_TITLE_MAX_LENGTH: number = 100

export interface IAgentChat extends Document {
  owner: Types.ObjectId
  title: string
  createdAt: number
  updatedAt: number
  userDeletedChat: boolean
  userDeletedAt: number | null
  messageCount: number
  promptTokens: number
  completionTokens: number
  stepStartedAt: number | null
  requestParts?: Record<string, any>
}

const nonNegativeInteger = (field: string): { validator: (value: number) => boolean, msg: string } => ({
  validator: (value: number): boolean => Number.isInteger(value) && value >= 0,
  msg: `DB: ${field} must be a non-negative integer`
})

/**
 * One Badhan Agent conversation. Its messages are separate documents (AgentMessage), because a
 * single tool response can be 250 KB and fifty of them inside one document would pass MongoDB's
 * 16 MB limit.
 */
const agentChatSchema: Schema = new Schema<IAgentChat>({
  // The ONLY thing stored about the member. Name, hall and designation are looked up from Donors
  // when read, so a promotion or a rename is reflected everywhere, and a chat whose donor record
  // has since been deleted is shown as a deleted member rather than under a stale name.
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: AGENT_CHAT_TITLE_MAX_LENGTH
  },
  // Milliseconds, set explicitly rather than through mongoose's `timestamps` option, which would
  // store Dates where the rest of the codebase stores numbers. Renaming does NOT move updatedAt:
  // it is the last time the conversation itself moved, and the member's list is ordered by it.
  createdAt: {
    type: Number,
    required: true,
    default: (): number => Date.now(),
    validate: [checkNumber('createdAt'), checkTimeStamp('createdAt')]
  },
  updatedAt: {
    type: Number,
    required: true,
    default: (): number => Date.now(),
    validate: [checkNumber('updatedAt'), checkTimeStamp('updatedAt')]
  },
  // The member's delete is a soft delete. The chat disappears from their list on every device,
  // but it and its messages stay here until a super admin deletes it permanently. The member is
  // not told; the delete confirmation reads like an ordinary delete.
  userDeletedChat: {
    type: Boolean,
    required: true,
    default: false
  },
  userDeletedAt: {
    type: Number,
    default: null,
    validate: [checkNullableTimeStamp('userDeletedAt')]
  },
  // The `seq` the next message will get. Kept on the chat so a step can claim positions without
  // counting the messages collection.
  messageCount: {
    type: Number,
    required: true,
    default: 0,
    validate: [nonNegativeInteger('messageCount')]
  },
  // Running totals across the chat's model calls. The review page shows them; the organisation's
  // key pays for every member and there is no daily budget, so this is the only view of spend.
  promptTokens: {
    type: Number,
    required: true,
    default: 0,
    validate: [nonNegativeInteger('promptTokens')]
  },
  completionTokens: {
    type: Number,
    required: true,
    default: 0,
    validate: [nonNegativeInteger('completionTokens')]
  },
  // The per-chat step lock: set atomically when a step starts, cleared when it ends, and treated
  // as free once it is three minutes old. It stops two tabs running steps on one chat at once.
  stepStartedAt: {
    type: Number,
    default: null,
    validate: [checkNullableTimeStamp('stepStartedAt')]
  },
  // What every model call in the chat sends but rarely changes — the system prompt's fixed part,
  // the tools list and the request settings — each version stored ONCE, under its kind and a hash
  // of its content: { 'tools_3f9c…': [...] }. Each call's message points at its versions by key
  // (AgentMessage.modelCall; services/agent/callRecord.ts), so nothing is repeated inside a chat. A chat that spans a deploy
  // holds one version from before it and one from after. Absent on chats made before calls were
  // recorded. Mixed, for the reason given in AgentMessage.ts, and written only with `$set` on a
  // dotted path. Never shown to the member: every member projection is an inclusion projection.
  requestParts: {
    type: Schema.Types.Mixed
  }
}, { versionKey: false, id: false, minimize: false })

// A member's own list: their chats they have not deleted, newest first. This also serves every
// query on `owner` alone (the review page's grouping by member), because `owner` is its prefix —
// so there is deliberately no separate { owner } index for writes to keep up to date.
agentChatSchema.index({ owner: 1, userDeletedChat: 1, updatedAt: -1 })

export const AgentChatModel: Model<IAgentChat> = model<IAgentChat>('AgentChats', agentChatSchema)
