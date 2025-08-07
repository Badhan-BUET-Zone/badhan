import { Schema, model, Model, Document} from 'mongoose'
import { checkNumber, checkPublicContactBloodGroup } from './validators'
export interface IPublicContact extends Document {
  donorId: Schema.Types.ObjectId,
  bloodGroup: number,
}

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

const publicContactSchema: Schema = new Schema<IPublicContact>({
  donorId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Donor'
  },
  bloodGroup: {
    type: Number,
    default: -1,
    validate: [checkNumber('bloodGroup'), checkPublicContactBloodGroup('bloodGroup')],
    required: true
  }

}, { versionKey: false, id: false })

export const PublicContactModel: Model<IPublicContact> = model<IPublicContact>('PublicContacts', publicContactSchema)
