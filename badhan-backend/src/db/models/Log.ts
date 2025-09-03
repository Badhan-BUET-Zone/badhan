import {Document, Schema, model, Model} from 'mongoose'
import { year2000TimeStamp } from '../../constants'
import { checkNumber, checkTimeStamp } from './validators'
export interface ILog extends Document {
  donorId: Schema.Types.ObjectId,
  date: number,
  operation: string,
  details: object
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Logs:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor who accessed an api
 *           example: abcdef123456789
 *         date:
 *           type: number
 *           description: timestamp of api access
 *           example: 1234578161648
 *         operation:
 *           type: string
 *           description: short detail of the API route
 *           example: POST SIGNIN
 *         details:
 *           type: object
 *           description: any further information needed to be kept in logs
 */

const logSchema: Schema = new Schema<ILog>({
  donorId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  date: {
    type: Number,
    required: true,
    default: Date.now,
    min: 0,
    validate: [checkNumber('date'),checkTimeStamp('date')]
  },
  operation: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    required: true
  },
}, { versionKey: false, id: false })

export const LogModel: Model<ILog> = model<ILog>('Logs', logSchema)
