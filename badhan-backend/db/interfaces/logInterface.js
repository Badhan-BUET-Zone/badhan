const {Log} = require('../models/Log');
const mongoose = require('mongoose');

const addLog = async (donorId, operation, details) => {
    if (donorId.equals("5e901d56effc5900177ced73")) {
        return;
    }

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
};

const getLogs = async () => {

    let logs = await Log.find().populate({path: 'donorId', select: {'name': 1, 'hall': 1, 'designation': 3}});
    return {
        message: 'Log insertion successful',
        status: 'OK',
        data: logs,

    }
}
const deleteLogs = async () => {

    let logs = await Log.deleteMany();
    return {
        message: 'Log deletion successful',
        status: 'OK',
        data: logs,
    }
}

const getLogCounts = async () => {
    let data = await Log.aggregate(
        [
            {
                $project: {
                    dateString: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $toDate: "$date"
                            },
                            timezone: "+06:00"
                        }
                    },
                }
            },
            {
                $group: {
                    _id: {
                        dateString: "$dateString",
                    },
                    count: {$sum: 1}
                }
            },
            {
                $project: {
                    _id: 0,
                    dateString: "$_id.dateString",
                    count: "$count"
                }
            },
            {$sort: {"dateString": -1}}
        ]
    );

    return {
        message: 'Log count by date fetched successfully',
        status: 'OK',
        data: data,
    }
};
const getLogsByDate = async (date) => {
    let data = await Log.aggregate([
        {
            $match: {
                date: {
                    $gt: date,
                    $lt: date + 24 * 3600 * 1000
                }
            }
        },
        {
            $lookup: {
                from: 'donors',
                localField: 'donorId',
                foreignField: '_id',
                as: 'donorDetails'
            }
        },
        {
            $group: {
                _id: {
                    name: {$arrayElemAt: ["$donorDetails.name", 0]},
                    donorId: "$donorId",
                    hall: {$arrayElemAt: ["$donorDetails.hall", 0]}
                },
                count: {$sum: 1}
            }
        },
        {
            $project: {
                name: "$_id.name",
                donorId: "$_id.donorId",
                hall: "$_id.hall",
                count: "$count",
                _id: 0
            }
        },
        {
            $sort: {
                count: -1
            }
        }
    ]);

    return {
        message: 'Log fetched by specific timestamp successfully',
        status: 'OK',
        data: data,
    }
}

const getLogsByDateAndUser = async (date, donorId) => {
    let data = await Log.aggregate([
        {
            $match: {
                date: {
                    $gt: date,
                    $lt: date + 24 * 1000 * 3600
                },
                donorId: mongoose.Types.ObjectId(donorId)
            }
        },
        {
            $lookup: {
                from: 'donors',
                localField: 'donorId',
                foreignField: '_id',
                as: 'donorDetails'
            }
        },
        {
            $project: {
                date: "$date",
                operation: "$operation",
                details: "$details",
            }
        },
        {
            $sort: {
                date: -1
            }
        }
    ]);

    return {
        message: "Logs fetched by user and date",
        status: 'OK',
        data: data
    }
}

module.exports = {
    addLog,
    getLogs,
    deleteLogs,
    getLogCounts,
    getLogsByDate,
    getLogsByDateAndUser
}
