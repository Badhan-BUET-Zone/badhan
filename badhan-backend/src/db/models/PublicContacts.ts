// @ts-nocheck
const mongoose = require('mongoose')

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
