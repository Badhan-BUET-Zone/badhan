// @ts-nocheck
// tslint:disable
import mongoose, {Schema, model} from 'mongoose'

export interface IActiveDonor extends mongoose.Document {
  donorId: Schema.Types.ObjectId;
  markerId: Schema.Types.ObjectId;
  time: number;
}

const activeDonorSchema = new Schema<IActiveDonor>({
  donorId: {
    type: Schema.Types.ObjectId,
    ref: 'Donor',
    required: true,
    unique: true
  },
  markerId: {
    type: Schema.Types.ObjectId,
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

export const ActiveDonorModel = model<IActiveDonor>('ActiveDonors', activeDonorSchema)
