import mongoose from 'mongoose'
export interface IPublicContact {
  donorId: mongoose.Schema.Types.ObjectId,
  bloodGroup: number,
}
const publicContactSchema = new mongoose.Schema<IPublicContact>({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  bloodGroup: {
    type: Number,
    default: -1,
    validate: [{
      validator: (value: number) => {
        return Number.isInteger(value)
      },
      msg: 'DB: bloodGroup must be an integer'
    }, {
      validator: (value: number) => {
        return [-1, 0, 2, 4, 6].includes(value)
      },
      msg: 'DB: Please input a valid bloodGroup'
    }],
    required: true
  }

}, { versionKey: false, id: false })

export const PublicContactModel = mongoose.model<IPublicContact>('PublicContacts', publicContactSchema)
