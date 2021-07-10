const mongoose = require('mongoose');
const callRecordSchema = new mongoose.Schema({
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true
    },
    calleeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true
    },
    date: {
        type: Number,
        required: true,
    }
});

const CallRecord = mongoose.model('CallRecords', callRecordSchema);


module.exports = { CallRecord, callRecordSchema }
