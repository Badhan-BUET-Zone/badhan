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
        default: Date.now,
    },
    operation:{
        type: String,
        required: true,
    },
    editedObject: {
        type: Object,
        required: true,
    },
    expireAt: {
        type: Date,
        default: ()=>{
            return new Date().getTime()+60*1000*60*24*30//30days
        },
    }

});

logSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Log = mongoose.model('Logs', logSchema);


module.exports = { Log }
