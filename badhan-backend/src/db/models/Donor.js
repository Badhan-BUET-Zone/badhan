const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { CallRecord } = require('./CallRecord')
const { Donation } = require('./Donation')
const { Log } = require('./Log')
const { PublicContact } = require('./PublicContacts')
const { Token } = require('./Token')
const { ActiveDonor } = require('./ActiveDonor')
const { checkEmail } = require('../../validations/validateRequest/others')
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
 *           example: 8801521438557
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
const donorSchema = new mongoose.Schema({
  phone: {
    unique: true,
    type: Number,
    required: true,
    min: 8801000000000,
    max: 8801999999999,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
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
      validator: (value) => {
        return [0, 1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 18].includes(parseInt(value.substr(2, 2)))
      },
      msg: 'DB: Please input a valid department number'
    }, {
      validator: (value) => {
        const inputYear = parseInt('20' + value.substr(0, 2))
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
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: bloodGroup must be an integer'
    }, {
      validator: (value) => {
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
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: hall must be an integer'
    }, {
      validator: (value) => {
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
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: designation must be an integer'
    }, {
      validator: (value) => {
        return [0, 1, 2, 3].includes(value)
      },
      msg: 'DB: Please input a valid designation'
    }],
    required: true
  },
  lastDonation: {
    type: Number,
    default: 0,
    min: 0,
    required: true,
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: lastDonation must be an integer'
    }]
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
    default: 0,
    required: true,
    validate: [{
      validator: (value) => {
        return Number.isInteger(value)
      },
      msg: 'DB: commentTime must be an integer'
    }]
  },
  // donationCount: {
  //     type: Number,
  //     default: 0,
  //     min: 0,
  //     max: 99,
  //     required: true,
  //     validate: [{
  //         validator: (value) => {
  //             return Number.isInteger(value);
  //         }, msg: 'DB: donationCount must be an integer'
  //     }],
  // },
  availableToAll: {
    type: Boolean,
    required: true
  },
  email: {
    type: String,
    default: '',
    maxlength: 100,
    validate: [{
      validator: (email) => {
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

donorSchema.virtual('donationCountOptimized', {
  ref: 'Donations',
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

donorSchema.methods.toJSON = function () {
  const donor = this
  const donorObject = donor.toObject()

  delete donorObject.password
  delete donorObject.tokens

  return donorObject
}

donorSchema.pre('save', function (next) {
  const donor = this
  if (donor.isModified('password')) {
    /* eslint-disable node/handle-callback-err */
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(donor.password, salt, (err, hash) => {
        donor.password = hash
        next()
      })
    })
    /* eslint-enable node/handle-callback-err */
  } else {
    next()
  }
})

donorSchema.post('findOneAndDelete', async (donor) => {
  await CallRecord.deleteMany({ callerId: donor._id })
  await CallRecord.deleteMany({ calleeId: donor._id })
  await Donation.deleteMany({ donorId: donor._id })
  await Log.deleteMany({ donorId: donor._id })
  await PublicContact.deleteMany({ donorId: donor._id })
  await Token.deleteMany({ donorId: donor._id })
  await ActiveDonor.deleteMany({ donorId: donor._id })
  await ActiveDonor.deleteMany({ markerId: donor._id })
})

const Donor = mongoose.model('Donor', donorSchema)

module.exports = { Donor }
