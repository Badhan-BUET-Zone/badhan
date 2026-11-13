import { Schema, model, Model, Document, Types } from 'mongoose'
import { checkNumber, checkTimeStamp } from './validators'

// `error` is a model call that failed. It is a record for the download on the review page, not
// part of the conversation: the model is never sent it, it does not count towards the per-message
// limit, and neither the member's routes nor the review transcript return it.
export const AGENT_MESSAGE_ROLES: string[] = ['user', 'assistant', 'tool', 'error']

export type AgentMessageRole = 'user' | 'assistant' | 'tool' | 'error'

export interface IAgentMessage extends Document {
  chatId: Types.ObjectId
  seq: number
  role: AgentMessageRole
  content: string
  // assistant messages only
  toolCalls?: any[]
  openaiModel?: string
  usage?: any
  // tool messages only
  toolCallId?: string
  run?: any
  // assistant and error messages only
  modelCall?: any
  createdAt: number
}

/**
 * One message of a Badhan Agent chat, in its own document rather than inside the chat: one tool
 * response can be 250 KB, and a chat holding fifty of them would pass MongoDB's 16 MB limit.
 *
 * WHY THE STRUCTURED FIELDS ARE MIXED. `toolCalls`, `usage`, `run` and `modelCall` are written only
 * by the agent service, which owns their shape: `toolCalls` exactly as OpenAI returned them; `run`
 * keeping the browser's shape (status, name, method, path with query, args, body, isWrite, HTTP
 * status, duration, the response for display, a note, and the card's `label`); `modelCall` as
 * services/agent/callRecord.ts describes it. Declaring them as nested
 * paths or subdocuments would make the Schema Inconsistencies report flag every tool message: it
 * compares a document's top-level keys with the schema's paths, so a nested `run` reads as an
 * extra field and a subdocument as a type mismatch. Mixed is what that report skips. The cost is
 * mongoose's usual one: a Mixed value changed in place is not noticed, so update these with
 * `$set` or `markModified`, never by mutating a loaded document.
 *
 * Role-specific fields are left unset, not null, on the other roles, and none of them is
 * `required`: a conditional `required` would still count as required to that report.
 *
 * Notices ("Stopped.", OpenAI errors, the per-message limit) are never stored. They belong to one
 * browser's session.
 */
const agentMessageSchema: Schema = new Schema<IAgentMessage>({
  chatId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'AgentChats'
  },
  // Position in the chat, from 0. Unique within a chat (index below).
  seq: {
    type: Number,
    required: true,
    validate: [{
      validator: (value: number): boolean => Number.isInteger(value) && value >= 0,
      msg: 'DB: seq must be a non-negative integer'
    }]
  },
  role: {
    type: String,
    required: true,
    enum: AGENT_MESSAGE_ROLES
  },
  // The user's text, the assistant's text (empty when the answer is only tool calls), or for a
  // tool message the copy of the result that is sent to the model. No maxlength: each writer clips
  // to its own limit, and a backstop here would turn an over-long model answer into a lost answer.
  content: {
    type: String,
    default: ''
  },
  // `default: undefined` so user and tool messages do not each carry an empty array.
  toolCalls: {
    type: [Schema.Types.Mixed],
    default: undefined
  },
  // The model that wrote the answer. Not called `model`: a hydrated document already has a
  // model() method, and a schema path of that name would shadow it.
  openaiModel: {
    type: String
  },
  usage: {
    type: Schema.Types.Mixed
  },
  toolCallId: {
    type: String
  },
  run: {
    type: Schema.Types.Mixed
  },
  // The model call that wrote this message (assistant) or failed (error): references into the
  // chat's `requestParts` for what every call repeats, and only what is this call's own. Absent on
  // messages saved before calls were recorded.
  modelCall: {
    type: Schema.Types.Mixed
  },
  createdAt: {
    type: Number,
    required: true,
    default: (): number => Date.now(),
    validate: [checkNumber('createdAt'), checkTimeStamp('createdAt')]
  }
// `minimize: false` keeps empty objects inside the Mixed fields. By default mongoose strips them on
// save, so a tool call made with no arguments would come back with no `args` at all.
}, { versionKey: false, id: false, minimize: false })

// Every read of a chat is "all its messages, in order", and the uniqueness is what stops two
// writers claiming the same position.
agentMessageSchema.index({ chatId: 1, seq: 1 }, { unique: true })

export const AgentMessageModel: Model<IAgentMessage> = model<IAgentMessage>('AgentMessages', agentMessageSchema)
