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
const findManyByCallee = async (calleeId)=>{
    try {
        let data = await CallRecord.find({calleeId});



        return {
            message: "Fetched call record successfully",
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

const deleteById = async (id)=>{
    try {
        let data = await CallRecord.findByIdAndDelete(id);

        return {
            message: "Call record deleted successfully",
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

const findById = async (id)=>{
    try {
        let data = await CallRecord.findOne({_id:id});

        if(!data){
            return {
                message: "No call record found",
                status: 'ERROR',
            }
        }

        return {
            message: "Call record fetched successfully",
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
    insertOne,
    findManyByCallee,
    deleteById,
    findById
}
