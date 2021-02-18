const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
        type: String
    },
    roomNumber: {
        type: String,
    },
    designation: {
        type: Number,
        default: 0,
        minlength: 1,
        maxlength: 1
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
        type: String
    },
    donationCount: {
        type: Number,
        default: 0
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
});

donorSchema.pre('save', function (next) {
    let donor = this;
    if (donor.isModified('password')){
        bcrypt.genSalt(10, (err,salt) => {
            bcrypt.hash(donor.password, salt,(err, hash) => {
                donor.password = hash;
                donor.tokens = [];
                next();
            })
        });
    } else {
        next();
    }
});


const Donor = mongoose.model('Donor', donorSchema);


module.exports = { Donor }
