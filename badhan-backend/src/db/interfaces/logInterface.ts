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

export const getLogs = async (): Promise<{data: ILog[], status: string, message: string}> => {
    const data: ILog[] = await LogModel.aggregate(
        [
            {
                $lookup: {
                    from: 'donors',
                    localField: 'donorId',
                    foreignField: '_id',
                    as: 'donorDetails'
                }
            },
            {
                $unwind: '$donorDetails'
            },
            {
                $project: {
                    name: '$donorDetails.name',
                    hall: '$donorDetails.hall',
                    date: '$date',
                    operation: '$operation',
                }
            }
        ]
    )

    return {
        message: 'Logs fetched successfully',
        status: 'OK',
        data
    }
}
