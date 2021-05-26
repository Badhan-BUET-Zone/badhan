const mongoose = require('mongoose');
const moment = require('moment');

const logSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    hall: {
        type: Number,
        required: true,
    },
    date: {
        type: Number,
        required: true,
        default: moment().valueOf()
    },
    operation:{
        type: String,
        required: true,
    },
    editedObject: {
        type: Object,
        required: true,
    }
});

const Log = mongoose.model('Logs', logSchema);


module.exports = { Log }
