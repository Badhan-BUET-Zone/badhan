const mongoose = require('mongoose');
const moment = require('moment');

const donationSchema = new mongoose.Schema({
    phone: {
        type: Number,
        required: true,
        maxlength: 13,
        minlength: 13
    },
    donorId: {
        type: String
    },
    date: {
        type: Number,
        required: true,
        default: moment().valueOf()
    }
});

const Donation = mongoose.model('Donations', donationSchema);


module.exports = { Donation }