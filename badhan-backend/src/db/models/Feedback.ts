import { Schema, model, Model, Document } from 'mongoose'
import { checkNumber, checkTimeStamp } from './validators'
import { HALLS_INDEX, HALL_INDICES_ALLOWED_FOR_DONOR } from '../../constants'

// The two submission kinds. `type` is a column rather than a key inside `feedbackJSON`
// because it is the discriminator: the route switches the validator on it, and the
// Feedback page switches the card on it.
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to string)
export const FEEDBACK_TYPES = {
  FEEDBACK: 'feedback',
  NEW_DONOR: 'newDonor'
} as const

export type FeedbackType = typeof FEEDBACK_TYPES[keyof typeof FEEDBACK_TYPES]

export const FEEDBACK_TYPE_VALUES: string[] = Object.values(FEEDBACK_TYPES)

// Backstop only. The route enforces the real per-type rules and its own size cap;
// this exists so that nothing can put an unbounded blob in the collection.
export const FEEDBACK_JSON_MAX_BYTES: number = 4096

export interface IFeedback extends Document {
  type: FeedbackType
  hall: number
  feedbackJSON: any
  date: number
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedbacks:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: which kind of submission this row is
 *           example: feedback
 *         hall:
 *           type: integer
 *           description: hall the submission is routed to, copied from the token and never from the submitter
 *           example: 6
 *         feedbackJSON:
 *           type: object
 *           description: everything the submitter sent, including their phone and student id
 *         date:
 *           type: number
 *           description: submission timestamp in milliseconds
 *           example: 1739011200000
 */

const feedbackSchema: Schema = new Schema<IFeedback>({
  type: {
    type: String,
    required: true,
    enum: FEEDBACK_TYPE_VALUES
  },
  // There is deliberately no `phone` or `studentId` column. Both live inside
  // `feedbackJSON` — a registration payload has to carry them anyway (it is the
  // donor-creation draft), so a column would be a second copy to keep in step.
  // Everything the submitter said is in `feedbackJSON`; everything the server
  // decided is a column.
  hall: {
    type: Number,
    required: true,
    validate: [checkNumber('hall'), {
      // ATTACHED is allowed here although a donor record may not carry it: a token
      // may legitimately be minted for someone with no specific hall.
      validator: (value: number): boolean => {
        return [...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED].includes(value)
      },
      msg: 'DB: Please input a valid hall number'
    }]
  },
  feedbackJSON: {
    type: Schema.Types.Mixed,
    required: true,
    validate: [{
      validator: (value: any): boolean => {
        return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') <= FEEDBACK_JSON_MAX_BYTES
      },
      msg: `DB: feedbackJSON must serialise to at most ${FEEDBACK_JSON_MAX_BYTES} bytes`
    }]
  },
  date: {
    type: Number,
    required: true,
    default: (): number => Date.now(),
    validate: [checkNumber('date'), checkTimeStamp('date')]
  }
}, { versionKey: false, id: false })

// Two indexes, and deliberately not a third.
// `{ hall, date }` serves the visibility filter followed by the oldest-first sort;
// `{ date }` serves the super admin's unfiltered list. There is no index for the donor
// join that renders the card: a $lookup is served by an index on the foreign
// collection, and `Donors.phone` is already unique-indexed. Index `feedbackJSON.phone`
// only if a query ever filters feedback rows by phone.
// No TTL index: nothing but a volunteer's discard may ever remove a row.
feedbackSchema.index({ hall: 1, date: 1 })
feedbackSchema.index({ date: 1 })

export const FeedbackModel: Model<IFeedback> = model<IFeedback>('Feedbacks', feedbackSchema)
