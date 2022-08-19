import mongoose from 'mongoose'
import exp from "constants";

const tokenSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  token: {
    type: String,
    required: true
  },
  expireAt: {
    type: Date,
    default: () => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 30// 30days
    },
    select: false
  },
  os: {
    type: String,
    required: true
  },
  browserFamily: {
    type: String,
    required: true
  },
  device: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  }
}, { versionKey: false, id: false })

tokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Tokens', tokenSchema)
