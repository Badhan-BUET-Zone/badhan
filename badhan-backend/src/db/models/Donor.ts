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
import { DEPARTMENT_CODES_FOR_VALIDATION, year2000TimeStamp } from '../../constants';
import { checkNumber, checkTimeStamp } from './validators';

export interface IDonor extends Document {
  phone: number;
  password?: string;
  studentId: string;
  bloodGroup: number;
  hall: number;
  address: string;
  roomNumber: string;
  // Not optional. The field carries `default: 0` and `required: true` below, the
  // `donors` collection validator (DONOR_VALIDATOR) refuses a document without it, and the
  // 20260809_materialize-required-defaults migration removed the last legacy documents that
  // predated all of that. Declaring it optional invited `donor.designation!` at every read site,
  // which asserted the invariant while the type denied it.
  designation: number;
  name: string;
  comment: string;
  commentTime?: number;
  availableToAll: boolean;
  archiveFlag: boolean;
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
 *         archiveFlag:
 *           type: boolean
 *           description: if this flag is true, then the donor is archived and is kept out of the default search space
 *           example: false
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
        return DEPARTMENT_CODES_FOR_VALIDATION.includes(parseInt(value.substr(2, 2), 10))
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
  archiveFlag: {
    type: Boolean,
    required: true,
    default: false
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

/*
 * Donor search (GET /search/v3) always pins `archiveFlag` as the leading equality predicate, and
 * then filters on either `hall` or `availableToAll`, optionally with `bloodGroup`. `studentId`,
 * `name` and `address` are `$regex` with a leading `.*`, so they are not index-usable and stay off
 * the prefix. The production indexes are built explicitly by the
 * `20260802_add-archive-flag` migration (after the backfill, so they are built over materialized
 * values); these declarations keep fresh/test databases in sync and stop `syncIndexes()` from
 * dropping the migration's work on the next boot.
 */
donorSchema.index({ archiveFlag: 1, hall: 1, bloodGroup: 1 })
donorSchema.index({ archiveFlag: 1, availableToAll: 1, bloodGroup: 1 })

/*
 * The server-side guarantee that a donor carries a designation.
 *
 * Mongoose `required` is only enforced when a document is validated — `save()`. It does nothing on
 * `updateOne`/`updateMany`/`findOneAndUpdate` unless `runValidators` is passed, and nothing at all
 * for a write that goes straight through the driver. The production collection held documents with
 * no `designation` field for exactly that reason, and mongoose hid them: a schema default is applied
 * when a document is *hydrated*, so every `find()` reported `designation: 0` while the stored
 * document had no such field and matched neither `{designation: 0}` nor any `$in` list.
 *
 * This validator closes the hole below mongoose, where it cannot be bypassed.
 *
 * Deliberately narrow — one field. A validator asserting the whole donor schema would make every
 * legacy-malformed donor unwritable, and the first symptom would be an opaque
 * "Document failed validation" when somebody pressed Save on a profile they were trying to repair.
 *
 * `bsonType: 'number'`, not `'int'`: mongoose stores an integral JS number as BSON int32 today, but
 * a legacy document holding a double would then be unwritable — the very failure the narrow scope
 * exists to avoid. `enum` does the real work.
 *
 * Applied by syncCollectionValidators() on every boot, because it is not part of the collection's
 * identity the way an index is: `mongorestore --drop` and `dropDatabase()` both discard it silently.
 */
export const DONOR_VALIDATOR: Record<string, any> = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['designation'],
    properties: {
      designation: {
        bsonType: 'number',
        enum: [0, 1, 2, 3],
        description: 'designation must be present and one of 0, 1, 2, 3'
      }
    }
  }
}

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


// `Feedbacks` is deliberately absent from this cascade. A feedback row has no donor id
// to match on, and deleting a donor leaves their messages in the queue for a volunteer
// to clear by hand. The Feedback page has to render a donor-less row anyway — every
// new-donor registration is one — so the cascade would buy nothing.
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


