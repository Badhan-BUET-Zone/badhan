const {CallRecord} = require('../models/CallRecord');
const insertOne = async (callerId,calleeId)=>{
    try {
        let callRecord = new CallRecord(callerId,calleeId);
        let data = await callRecord.save();
        return {
            message: "Created call record successfully",
            status: 'OK',
            data: data,
        }
    } catch (e) {
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}
module.exports = {
    insertOne
}
