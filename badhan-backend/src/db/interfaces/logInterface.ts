import {ILog, LogModel} from '../models/Log'
import mongoose, {Aggregate} from 'mongoose'

export const addLog = async (donorId: mongoose.Types.ObjectId, operation: string, details: object): Promise<{message: string, status: string, data?: ILog}> => {
    const log: ILog = new LogModel({donorId, operation, details})
    const data: ILog = await log.save()
    return {
        message: 'Log insertion successful',
        status: 'OK',
        data
    }
}

export const deleteLogs = async (): Promise<{status: string, message: string}> => {
    await LogModel.deleteMany()
    return {
        message: 'Log deletion successful',
        status: 'OK',
    }
}

export const getLogCounts = async (): Promise<{data: ILog[], status: string, message: string}> => {
    const data: ILog[] = await LogModel.aggregate(
        [
            {
                $project: {
                    dateString: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: {
                                $toDate: '$date'
                            },
                            timezone: '+06:00'
                        }
                    },
                    donorId: '$donorId'
                }
            },
            {
                $group: {
                    _id: {
                        dateString: '$dateString',
                        donorId: '$donorId'
                    },
                    count: {$sum: 1}
                }
            },
            {
                $group: {
                    _id: {
                        dateString: '$_id.dateString'
                    },
                    activeUserCount: {$sum: 1},
                    totalLogCount: {$sum: '$count'}
                }
            },
            {
                $project: {
                    dateString: '$_id.dateString',
                    activeUserCount: 1,
                    totalLogCount: 1,
                    _id: 0
                }
            },
            {
                $sort: {
                    dateString: -1
                }
            }
        ]
    )

    return {
        message: 'Log count by date fetched successfully',
        status: 'OK',
        data
    }
}
export const getLogsByDate = async (date: number): Promise<{data: ILog[], status: string, message: string }> => {
    const data: ILog[] = await LogModel.aggregate([
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
                    name: {$arrayElemAt: ['$donorDetails.name', 0]},
                    donorId: '$donorId',
                    hall: {$arrayElemAt: ['$donorDetails.hall', 0]}
                },
                count: {$sum: 1}
            }
        },
        {
            $project: {
                name: '$_id.name',
                donorId: '$_id.donorId',
                hall: '$_id.hall',
                count: '$count',
                _id: 0
            }
        },
        {
            $sort: {
                count: -1
            }
        }
    ])

    return {
        message: 'Log fetched by specific timestamp successfully',
        status: 'OK',
        data
    }
}

export const getLogsByDateAndUser = async (date: number, donorId: string): Promise<{data: ILog[], message: string, status: string}> => {
    const data: ILog[] = await LogModel.aggregate([
        {
            $match: {
                date: {
                    $gt: date,
                    $lt: date + 24 * 1000 * 3600
                },
                donorId: new mongoose.Types.ObjectId(donorId)
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
                date: '$date',
                operation: '$operation',
                details: '$details'
            }
        },
        {
            $sort: {
                date: -1
            }
        }
    ])

    return {
        message: 'Logs fetched by user and date',
        status: 'OK',
        data
    }
}
