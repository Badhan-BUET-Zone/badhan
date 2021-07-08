const mongoose = require('mongoose');
const moment = require('moment');
const callRecordSchema = new mongoose.Schema({
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    calleeId: {
        type: String,
        required: true,
    },
    date: {
        type: Number,
        required: true,
        default: moment().valueOf()
    }
});

const CallRecord = mongoose.model('CallRecords', callRecordSchema);


module.exports = { CallRecord }
