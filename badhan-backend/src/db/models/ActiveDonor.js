const mongoose = require('mongoose')

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
