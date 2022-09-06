import {Schema, model, Model, Document} from 'mongoose'

export interface ICallRecord extends Document {
  callerId: Schema.Types.ObjectId,
  calleeId: Schema.Types.ObjectId,
  date: number,
  expireAt?: number
}

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
    validate: [{
      validator: (value: number):boolean => {
        return Number.isInteger(value)
      },
      msg: 'DB: lastDonation must be an integer'
    }]
  },
  expireAt: {
    type: Date,
    default: (): number => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 3// 3days
    }
  }
}, { versionKey: false, id: false })

callRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export const CallRecordModel: Model<ICallRecord> = model<ICallRecord>('CallRecords', callRecordSchema)
