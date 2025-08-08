import {Schema, model, Model, Document} from 'mongoose'
import { year2000TimeStamp } from '../../constants';
import { checkNumber, checkTimeStamp } from './validators';

export interface IActiveDonor extends Document {
  donorId: Schema.Types.ObjectId;
  markerId: Schema.Types.ObjectId;
  time: number;
}

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

const activeDonorSchema: Schema = new Schema<IActiveDonor>({
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
    default: ():number => {
      return new Date().getTime()
    },
    validate: [checkNumber('time'),checkTimeStamp('time')],
  }
}, { versionKey: false, id: false })

export const ActiveDonorModel: Model<IActiveDonor> = model<IActiveDonor>('ActiveDonors', activeDonorSchema)
