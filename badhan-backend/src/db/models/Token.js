const mongoose = require('mongoose')
/**
 * @swagger
 * components:
 *   schemas:
 *     Tokens:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of token owner
 *           example: abcd123456798
 *         token:
 *           type: string
 *           description: token string
 *           example: abcd12345679sdkghnswuiobnwsoiueghweoignwieugwesuignwg
 *         os:
 *           type: string
 *           description: name of os from which the user logged in
 *           example: Ubuntu
 *         browserFamily:
 *           type: string
 *           description: name of browser from which the user logged in
 *           example: ASUS
 *         device:
 *           type: string
 *           description: name of device from which the user logged in
 *           example: Huawei
 *         ipAddress:
 *           type: string
 *           description: IP address of the user
 *           example: 17.32.5.55
 */
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

const Token = mongoose.model('Tokens', tokenSchema)

module.exports = { Token }
