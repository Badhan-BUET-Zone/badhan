const {Log} = require('../models/Log');

const addLog = async (name, hall, operation, editedObject) => {
    try {
        let log = new Log({name, hall, operation, editedObject});
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
        let logs = await Log.find();


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

module.exports = {
    addLog,
    getLogs
}
