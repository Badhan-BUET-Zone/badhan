import { Schema, model, Model, Document, Types } from 'mongoose'
import { checkNumber, checkTimeStamp } from './validators'

// The composer's character counter and the route's validator both read this. It is a
// backstop in the schema so that nothing can put an unbounded blob in the collection.
export const MESSAGE_TEXT_MAX_LENGTH: number = 2000

export interface IMessage extends Document {
  senderId: Types.ObjectId
  text: string
  date: number
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Messages:
 *       type: object
 *       properties:
 *         senderId:
 *           type: string
 *           description: id of the member who sent the message; the only thing stored about them
 *           example: 5e6b8b3f1c9d440000a1b2c3
 *         text:
 *           type: string
 *           description: the message body, trimmed
 *           example: Two bags of O+ needed at DMC tonight
 *         date:
 *           type: number
 *           description: send timestamp in milliseconds
 *           example: 1739011200000
 */

const messageSchema: Schema = new Schema<IMessage>({
  // The ONLY thing stored about the sender. Name, batch, hall and designation are joined
  // live from Donors on every read, so a promotion or a rename updates every message that
  // person ever sent. Snapshotting any of them here would freeze a stale card forever.
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: MESSAGE_TEXT_MAX_LENGTH,
    // A belt-and-braces backstop. `trim: true` runs before `required`, so a whitespace-only
    // body is already rejected as missing — this validator only fires if that ordering ever
    // changes, and it states the rule the route enforces rather than leaving it implied.
    validate: [{
      validator: (value: string): boolean => {
        return typeof value === 'string' && value.trim().length > 0
      },
      msg: 'DB: text must not be empty'
    }]
  },
  date: {
    type: Number,
    required: true,
    default: (): number => Date.now(),
    validate: [checkNumber('date'), checkTimeStamp('date')]
  }
}, { versionKey: false, id: false })

// One compound index, and it is load-bearing for every read of this collection.
// `{ date: -1 }` alone is not enough: two messages sent in the same millisecond are ordered
// arbitrarily without the `_id` tiebreak, and an arbitrary order under a keyset cursor does
// not merely reshuffle a page — it DROPS messages at the page boundary. The descending
// direction matches the only sort the API ever issues.
// No index on senderId: nothing queries by sender. Add one when something does.
// No TTL index and no retention policy: a global room with no expiry grows without bound,
// and that cost is accepted rather than hidden. When it needs trimming the answer is a
// Super Admin purge route and a documented retention window, not a silent TTL that deletes
// history nobody was told was temporary.
messageSchema.index({ date: -1, _id: -1 })

export const MessageModel: Model<IMessage> = model<IMessage>('Messages', messageSchema)
