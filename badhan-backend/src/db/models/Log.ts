// @ts-nocheck
const mongoose = require('mongoose')

const logSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  date: {
    type: Number,
    required: true,
    default: Date.now,
    min: 0,
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: lastDonation must be an integer'
    }]
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
    default: () => {
      return new Date().getTime() + 60 * 1000 * 60 * 24 * 30// 30days
    },
    select: false
  }

}, { versionKey: false, id: false })

logSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const Log = mongoose.model('Logs', logSchema)

module.exports = { Log }
