const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {CallRecord} = require('./CallRecord');
const {Donation} = require('./Donation');
const {Log} = require('./Log')
const donorSchema = new mongoose.Schema({
    phone: {
        unique: true,
        type: Number,
        required: true,
        maxlength: 13,
        minlength: 13
    },
    password: {
        type: String
    },
    studentId: {
        type: String,
        required: true,
        minlength: 7,
        maxlength: 7
    },
    bloodGroup: {
        type: Number,
        required: true,
        minlength: 1,
        maxlength: 1
    },
    hall: {
        type: Number,
        required: true,
        minlength: 1,
        maxlength: 1
    },
    address: {
        type: String,
        required: true,
        default: "(unknown)",
    },
    roomNumber: {
        type: String,
        required: true,
        default: "(unknown)",
    },
    designation: {
        type: Number,
        default: 0,
        minlength: 1,
        maxlength: 1,
        required: true,
    },
    lastDonation: {
        type: Number,
        default: 0
    },
    name: {
        type: String,
        required: true,
        maxlength: 40
    },
    comment: {
        type: String,
        required: true,
        default: "(unknown)",
    },
    commentTime:{
        type: Number,
        default: 0
    },
    donationCount: {
        type: Number,
        default: 0
    },
    availableToAll:{
        type: Boolean,
        required: true
    }
});

donorSchema.virtual('callRecords', {
    ref: 'CallRecords',
    localField: '_id',
    foreignField: 'calleeId'
});

donorSchema.virtual('donations',{
    ref: 'Donations',
    localField: '_id',
    foreignField: 'donorId'
})

donorSchema.virtual('donationCountOptimized',{
    ref: 'Donations',
    localField: '_id',
    foreignField: 'donorId',
    count: true
})

donorSchema.set('toObject', { virtuals: true });
donorSchema.set('toJSON', { virtuals: true });

donorSchema.methods.toJSON = function () {
    const donor = this
    const donorObject = donor.toObject()

    delete donorObject.password
    delete donorObject.tokens

    return donorObject
}

donorSchema.pre('save', function (next) {
    let donor = this;
    if (donor.isModified('password')){
        bcrypt.genSalt(10, (err,salt) => {
            bcrypt.hash(donor.password, salt,(err, hash) => {
                donor.password = hash;
                next();
            })
        });
    } else {
        next();
    }
});

donorSchema.post('findOneAndDelete',  async (donor)=>{
    await CallRecord.deleteMany({callerId: donor._id});
    await CallRecord.deleteMany({calleeId: donor._id});
    await Donation.deleteMany({donorId:donor._id});
    await Log.deleteMany({donorId: donor._id});
});

const Donor = mongoose.model('Donor', donorSchema);


module.exports = { Donor }
