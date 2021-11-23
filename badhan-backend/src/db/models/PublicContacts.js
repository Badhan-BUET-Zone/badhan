const mongoose = require('mongoose')
/**
 * @swagger
 * components:
 *   schemas:
 *     PublicContacts:
 *       type: object
 *       properties:
 *         donorId:
 *           type: string
 *           description: id of donor who is published as public contact
 *           example: abcdef123456789
 *         bloodGroup:
 *           type: integer
 *           description: bloodgroup for which the donor is available to contact
 *           example: 2
 */
const publicContactSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  bloodGroup: {
    type: Number,
    default: -1,
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: bloodGroup must be an integer'
    }, {
      validator: (value) => {
        return [-1, 0, 2, 4, 6].includes(value)
      },
      msg: 'DB: Please input a valid bloodGroup'
    }],
    required: true
  }

}, { versionKey: false, id: false })

const PublicContact = mongoose.model('PublicContacts', publicContactSchema)

module.exports = { PublicContact }
