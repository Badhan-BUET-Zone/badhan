import {Document, model, Model, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import {CallRecordModel} from "./CallRecord";
import {DonationModel} from "./Donation";
import {LogModel} from "./Log";
import {PublicContactModel} from "./PublicContact";
import {ActiveDonorModel} from "./ActiveDonor";
import {TokenModel} from "./Token";
import { PlateletDonationModel } from "./PlateletDonation";
import { IDonation } from './Donation'
import { IPlateletDonation } from './PlateletDonation'
import { checkEmail } from '../../validations/validateRequest/others'
import { year2000TimeStamp } from '../../constants';
import { checkNumber, checkTimeStamp } from './validators';

export interface IDonor extends Document {
  phone: number;
  password?: string;
  studentId: string;
  bloodGroup: number;
  hall: number;
  address: string;
  roomNumber: string;
  designation?: number;
  name: string;
  comment: string;
  commentTime?: number;
  availableToAll: boolean;
  email?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Donors:
 *       type: object
 *       properties:
 *         phone:
 *           type: number
 *           description: Phone number of donor.
 *           example: 8801500000000
 *         password:
 *           type: string
 *           description: Donor password. Will be empty if the donor does not have an account.
 *           example: password123
 *         studentId:
 *           type: string
 *           description: Six digit student ID of BUET students
 *           example: 1605011
 *         bloodGroup:
 *           type: number
 *           description: Blood group of donor
 *           example: 3
 *         hall:
 *           type: number
 *           description: hall number of donor
 *           example: 5
 *         address:
 *           type: string
 *           description: address of donor
 *           example: Azimpur Road
 *         roomNumber:
 *           type: string
 *           description: hall room number of donor
 *           example: 3009
 *         designation:
 *           type: number
 *           description: designation of donor in Badhan platform
 *           example: 3
 *         lastDonation:
 *           type: number
 *           description: timestamp of last donation by donor
 *           example: 1234578161648
 *         lastPlateletDonation:
 *           type: number
 *           description: timestamp of last platelet donation by donor
 *           example: 1234578161648
 *         name:
 *           type: string
 *           description: name of donor
 *           example: Mir Mahathir Mohammad
 *         comment:
 *           type: string
 *           description: additional information of the donor
 *           example: Has high blood pressure
 *         commentTime:
 *           type: number
 *           description: timestamp of the latest update on comment
 *           example: 13216465164
 *         availableToAll:
 *           type: boolean
 *           description: if this flag is true, then the donor will be made available for all the halls
 *           example: true
 *         email:
 *           type: string
 *           description: email address of a donor
 *           example: mirmahathir1@gmail.com
 */

const donorSchema: Schema = new Schema<IDonor>({
  phone: {
    unique: true,
    type: Number,
    required: true,
    min: 8801000000000,
    max: 8801999999999,
    validate: [checkNumber('phone')]
  },
  password: {
    type: String
  },
  studentId: {
    type: String,
    required: true,
    trim: true,
    minlength: 7,
    maxlength: 7,
    validate: [{
      validator: (value: string): boolean => {
        return [0, 1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 17, 18].includes(parseInt(value.substr(2, 2), 10))
      },
      msg: 'DB: Please input a valid department number'
    }, {
      validator: (value: string): boolean => {
        const inputYear: number = parseInt('20' + value.substr(0, 2),10)
        return inputYear <= new Date().getFullYear() && inputYear >= 2001
      },
      msg: 'DB: Please input a valid batch between 01 and last two digits of current year'
    }]
  },
  bloodGroup: {
    type: Number,
    required: true,
    min: 0,
    max: 7,
    validate: [checkNumber('bloodGroup'), {
      validator: (value: number): boolean => {
        return [0, 1, 2, 3, 4, 5, 6, 7].includes(value)
      },
      msg: 'DB: Please input a valid blood group number'
    }]
  },
  hall: {
    type: Number,
    required: true,
    min: 0,
    max: 8,
    validate: [checkNumber('hall'), {
      validator: (value: number): boolean => {
        return [0, 1, 2, 3, 4, 5, 6, 8].includes(value)
      },
      msg: 'DB: Please input a valid hall number'
    }]
  },
  address: {
    type: String,
    trim: true,
    default: '(Unknown)',
    required: true,
    minlength: 2,
    maxlength: 500
  },
  roomNumber: {
    type: String,
    trim: true,
    default: '(Unknown)',
    required: true,
    minlength: 2,
    maxlength: 500
  },
  designation: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
    validate: [checkNumber('designation'), {
      validator: (value: number): boolean => {
        return [0, 1, 2, 3].includes(value)
      },
      msg: 'DB: Please input a valid designation'
    }],
    required: true
  },
  name: {
    type: String,
    trim: true,
    required: true,
    minlength: 3,
    maxlength: 100
  },
  comment: {
    type: String,
    trim: true,
    default: '(Unknown)',
    required: true,
    minlength: 2,
    maxlength: 500
  },
  commentTime: {
    type: Number,
    min: 0,
    default: year2000TimeStamp,
    required: true,
    validate: [checkNumber('commentTime'),checkTimeStamp('commentTime')],
  },

  availableToAll: {
    type: Boolean,
    required: true
  },
  email: {
    type: String,
    default: '',
    maxlength: 100,
    validate: [{
      validator: (email: string): boolean => {
        if (email === '') {
          return true
        }
        return checkEmail(email)
      },
      msg: 'DB: Email is not valid'
    }]
  }

}, { versionKey: false, id: false })

donorSchema.virtual('callRecords', {
  ref: 'CallRecords',
  localField: '_id',
  foreignField: 'calleeId'
})

donorSchema.virtual('donations', {
  ref: 'Donations',
  localField: '_id',
  foreignField: 'donorId'
})

donorSchema.virtual('plateletDonations', {
  ref: 'PlateletDonations',
  localField: '_id',
  foreignField: 'donorId'
})

donorSchema.virtual('donationCountOptimized', {
  ref: 'Donations',
  localField: '_id',
  foreignField: 'donorId',
  count: true
})

donorSchema.virtual('plateletDonationCount', {
  ref: 'PlateletDonations',
  localField: '_id',
  foreignField: 'donorId',
  count: true
})

donorSchema.virtual('logCount', {
  ref: 'Logs',
  localField: '_id',
  foreignField: 'donorId',
  count: true
})

donorSchema.virtual('publicContacts', {
  ref: 'PublicContacts',
  localField: '_id',
  foreignField: 'donorId'
})

donorSchema.virtual('markedBy', {
  ref: 'ActiveDonors',
  localField: '_id',
  foreignField: 'donorId',
  justOne: true
})

donorSchema.set('toObject', { virtuals: true })
donorSchema.set('toJSON', { virtuals: true })

donorSchema.methods.toJSON = function (): IDonor {
  const donor: {[p: string]: any} = this
  const donorObject: IDonor = donor.toObject()

  delete donorObject.password

  return donorObject
}

// reason for definition of next function: https://github.com/Automattic/mongoose/issues/11449
donorSchema.pre<IDonor>('save', function (next: (err?: Error) => void):void{
  const donor: IDonor = this
  if (donor.isModified('password')) {
    bcrypt.genSalt(10, (err: Error, salt: string):void => {
      bcrypt.hash(donor.password!, salt, (errHash: Error, hash: string):void => {
        donor.password = hash
        next()
      })
    })
  } else {
    next()
  }
})


donorSchema.post('findOneAndDelete', async (donor: IDonor):Promise<void> => {
  await CallRecordModel.deleteMany({ callerId: donor._id })
  await CallRecordModel.deleteMany({ calleeId: donor._id })
  await DonationModel.deleteMany({ donorId: donor._id })
  await PlateletDonationModel.deleteMany({ donorId: donor._id })
  await LogModel.deleteMany({ donorId: donor._id })
  await PublicContactModel.deleteMany({ donorId: donor._id })
  await TokenModel.deleteMany({ donorId: donor._id })
  await ActiveDonorModel.deleteMany({ donorId: donor._id })
  await ActiveDonorModel.deleteMany({ markerId: donor._id })
})

export const DonorModel: Model<IDonor> = model<IDonor>('Donor', donorSchema)


