const mongoose = require('mongoose')
/**
 * @swagger
 * components:
 *   schemas:
 *     ActiveDonors:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor
 *           example: dabcd6465166516
 *         markerId:
 *           type: string
 *           description: id of the badhan member who marked the donor
 *           example: dabcd6465166516
 *         time:
 *           type: number
 *           description: timestamp of marking
 *           example: 1234578161648
 */
const activeDonorSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true,
    unique: true
  },
  markerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  time: {
    type: Number,
    min: 0,
    required: true,
    default: () => {
      return new Date().getTime()
    }
  }
}, { versionKey: false, id: false })

const ActiveDonor = mongoose.model('ActiveDonors', activeDonorSchema)

module.exports = { ActiveDonor }
