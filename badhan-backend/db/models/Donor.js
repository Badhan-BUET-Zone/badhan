const mongoose = require('mongoose');
const moment = require('moment');
const jwt = require('jsonwebtoken');

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

donorSchema.methods.generateAuthToken = async function() {
    const user = this;

    const token = await jwt.sign({ _id: user._id.toString() }, 'secretkey');

    user.tokens = [{ token }];
    await user.save();

    return token;
}

donorSchema.methods.authenticate = async function(token) {

    const donor = this;

    if (!donor) {
        throw new Error('User does not exist.');
    }

    if (donor.tokens[0].token !== token) {
        throw new Error('User is not authenticated.')
    }

    return donor;

}

donorSchema.statics.findByCredentials = async function(phone, password) {

    const donor = await Donor.findOne({ phone });

    if (!donor) {
        throw new Error('Unable to find donor with this phone number.');
    }

    if (password.localeCompare(donor.password) !== 0) {
        throw new Error(`Incorrect password ${password}`);
    }

    return donor;
}

const Donor = mongoose.model('Donor', donorSchema);


module.exports = { Donor }
