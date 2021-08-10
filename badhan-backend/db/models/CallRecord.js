const mongoose = require('mongoose');
const callRecordSchema = new mongoose.Schema({
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true,
    },
    calleeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true,
    },
    date: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
        validate: [{
            validator: (value) => {
                return Number.isInteger(value);
            }, msg: 'DB: lastDonation must be an integer'
        }],
    },
    expireAt: {
        type: Date,
        default: ()=>{
            return new Date().getTime()+60*1000*60*24*30//30days
        },
    }
});

callRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const CallRecord = mongoose.model('CallRecords', callRecordSchema);


module.exports = { CallRecord, callRecordSchema }
