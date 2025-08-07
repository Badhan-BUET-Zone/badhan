import {Schema, model, Model, Document} from 'mongoose'
import { year2000TimeStamp } from '../../constants'
import { checkNumber, checkTimeStamp } from './validators'

export interface ICallRecord extends Document {
  callerId: Schema.Types.ObjectId,
  calleeId: Schema.Types.ObjectId,
  date: number,
  expireAt?: number
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CallRecords:
 *       type: object
 *       properties:
 *         callerId:
 *           type: string
 *           description: id of caller
 *           example: abcd123456798
 *         calleeId:
 *           type: string
 *           description: id of callee
 *           example: abcd123456798
 *         date:
 *           type: number
 *           description: timestamp of donation
 *           example: 1234578161648
 */

const callRecordSchema: Schema = new Schema<ICallRecord>({
  callerId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  calleeId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  date: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
    validate: [checkNumber('date'),checkTimeStamp('date')]
  },
  expireAt: {
    type: Date,
    default: (): number => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 3// 3days
    }
  }
}, { versionKey: false, id: false })

export const CallRecordModel: Model<ICallRecord> = model<ICallRecord>('CallRecords', callRecordSchema)
