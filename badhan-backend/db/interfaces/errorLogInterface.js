const {ErrorLog} = require('../models/ErrorLog');

const addErrorLog = async (actorId, status,message, details) => {
    try {
        let errorLog = new ErrorLog({actorId, message: status+": "+message, details});
        let data = await errorLog.save();

        if (data.nInserted === 0) {
            return {
                message: 'Error Log insertion failed',
                status: 'ERROR',
                data: data,
            }
        } else {
            return {
                message: 'Error Log insertion successful',
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

const getErrorLogs = async () => {
    try {
        let errorLogs = await ErrorLog.find();

        return {
            message: 'Error log insertion successful',
            status: 'OK',
            data: errorLogs,

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
const deleteErrorLogs = async()=>{
    try {
        let errorLogs = await ErrorLog.deleteMany();
        return {
            message: 'Error log deletion successful',
            status: 'OK',
            data: errorLogs,
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
    addErrorLog,
    getErrorLogs,
    deleteErrorLogs
}
