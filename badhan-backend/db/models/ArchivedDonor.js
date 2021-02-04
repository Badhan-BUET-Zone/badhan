const mongoose = require('mongoose');
const moment = require('moment');
const jwt = require('jsonwebtoken');

const archivedDonorSchema = new mongoose.Schema({
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
        unique: true,
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
        default: moment().subtract(120, 'days').valueOf()
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

const ArchivedDonor = mongoose.model('ArchivedDonor', archivedDonorSchema);


module.exports = { ArchivedDonor }
