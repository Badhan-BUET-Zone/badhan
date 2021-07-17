const {Log} = require('../models/Log');

const addLog = async (donorId, operation, details) => {
    try {
        let log = new Log({donorId, operation, details});
        let data = await log.save();

        if (data.nInserted === 0) {
            return {
                message: 'Log insertion failed',
                status: 'ERROR',
                data: data,
            }
        } else {
            return {
                message: 'Log insertion successful',
                status: 'OK',
                data: data,
            };
        }
    } catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
};

const getLogs = async () => {
    try {
        let logs = await Log.find().populate({path:'donorId',select:{'name':1,'hall':1,'designation':3}});
        return {
            message: 'Log insertion successful',
            status: 'OK',
            data: logs,

        }
    } catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}
const deleteLogs = async()=>{
    try {
        let logs = await Log.deleteMany();
        return {
            message: 'Log deletion successful',
            status: 'OK',
            data: logs,
        }
    } catch (e) {
        console.log("ERROR")
        return {
            message: e.message,
            status: 'ERROR',
            data: null
        }
    }
}

module.exports = {
    addLog,
    getLogs,
    deleteLogs
}
