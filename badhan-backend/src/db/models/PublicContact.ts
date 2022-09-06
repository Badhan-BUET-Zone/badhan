import { Schema, model, Model, Document} from 'mongoose'
export interface IPublicContact extends Document {
  donorId: Schema.Types.ObjectId,
  bloodGroup: number,
}
const publicContactSchema: Schema = new Schema<IPublicContact>({
  donorId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  bloodGroup: {
    type: Number,
    default: -1,
    validate: [{
      validator: (value: number): boolean => {
        return Number.isInteger(value)
      },
      msg: 'DB: bloodGroup must be an integer'
    }, {
      validator: (value: number): boolean => {
        return [-1, 0, 2, 4, 6].includes(value)
      },
      msg: 'DB: Please input a valid bloodGroup'
    }],
    required: true
  }

}, { versionKey: false, id: false })

export const PublicContactModel: Model<IPublicContact> = model<IPublicContact>('PublicContacts', publicContactSchema)
