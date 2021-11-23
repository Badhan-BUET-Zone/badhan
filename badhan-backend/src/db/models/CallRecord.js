const mongoose = require('mongoose')
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
 *           type: integer
 *           description: timestamp of donation
 *           example: 1234578161648
 */
const callRecordSchema = new mongoose.Schema({
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
      validator: (value) => {
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

// callRecordSchema.methods.toJSON = function () {
//     const callRecord = this
//     const callRecordObject = callRecord.toObject()
//     delete callRecordObject.expireAt
//     return callRecordObject
// }

const CallRecord = mongoose.model('CallRecords', callRecordSchema)

module.exports = { CallRecord, callRecordSchema }
