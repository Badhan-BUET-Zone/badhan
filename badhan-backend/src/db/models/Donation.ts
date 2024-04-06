import { Schema, Document, model, Model, Types} from 'mongoose'
import { year2000TimeStamp } from '../../constants'
import { checkNumber, checkTimeStamp } from './validators'

export interface IDonation extends Document {
  phone: number,
  donorId: Types.ObjectId,
  date: number
}
const donationSchema: Schema = new Schema<IDonation>({
  phone: {
    type: Number,
    required: true,
    maxlength: 13,
    minlength: 13
  },
  donorId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  date: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
    validate: [checkNumber('date'),checkTimeStamp('date')]
  }
}, { versionKey: false, id: false })

export const DonationModel: Model<IDonation> = model<IDonation>('Donations', donationSchema)
