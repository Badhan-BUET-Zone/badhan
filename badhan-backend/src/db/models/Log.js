const mongoose = require('mongoose')
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
 *           type: integer
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
