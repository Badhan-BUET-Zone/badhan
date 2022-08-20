import mongoose from 'mongoose'
export interface IDonation {
  phone: number,
  donorId: mongoose.Schema.Types.ObjectId,
  date: number
}
const donationSchema = new mongoose.Schema<IDonation>({
  phone: {
    type: Number,
    required: true,
    maxlength: 13,
    minlength: 13
  },
  donorId: {
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
  }
}, { versionKey: false, id: false })

export const DonationModel = mongoose.model('Donations', donationSchema)
