import {Document, Schema, model, Model} from 'mongoose'
import { year2000TimeStamp } from '../../constants'
import { checkNumber, checkTimeStamp } from './validators'
export interface ILog extends Document {
  donorId: Schema.Types.ObjectId,
  date: number,
  operation: string,
  details: object,
  expireAt?: number
}
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
  expireAt: {
    type: Date,
    default: (): number => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 30// 30days
    },
    select: false
  }

}, { versionKey: false, id: false })

export const LogModel: Model<ILog> = model<ILog>('Logs', logSchema)
