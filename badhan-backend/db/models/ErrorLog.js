const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true
    },
    date: {
        type: Number,
        required: true,
        default: Date.now,
    },
    message:{
        type: String,
        required: true,
    },
    details: {
        type: Object,
        required: true,
    }
});

const ErrorLog = mongoose.model('ErrorLogs', errorLogSchema);

module.exports = { ErrorLog }
