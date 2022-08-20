import mongoose from 'mongoose'

export interface ICallRecord {
  callerId: mongoose.Schema.Types.ObjectId,
  calleeId: mongoose.Schema.Types.ObjectId,
  date: number,
  expireAt?: number
}

const callRecordSchema = new mongoose.Schema<ICallRecord>({
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  calleeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  date: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
    validate: [{
      validator: (value: number) => {
        return Number.isInteger(value)
      },
      msg: 'DB: lastDonation must be an integer'
    }]
  },
  expireAt: {
    type: Date,
    default: () => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 3// 3days
    }
  }
}, { versionKey: false, id: false })

callRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export const CallRecordModel = mongoose.model<ICallRecord>('CallRecords', callRecordSchema)
