import {IPlateletDonation} from "../models/PlateletDonation";
import {PlateletDonationModel} from "../models/PlateletDonation";
import { Condition } from 'mongoose'
import {Schema} from 'mongoose'

export const insertPlateletDonation = async (phone: number, donorId: Schema.Types.ObjectId, date: number ): Promise<{data: IPlateletDonation, message: string, status: string}> => {
    const plateletDonation: IPlateletDonation = new PlateletDonationModel({phone, donorId, date})
    const data: IPlateletDonation = await plateletDonation.save()

    return {
        data,
        message: 'Platelet donation insertion successful',
        status: 'OK'
    }
}

export const deletePlateletDonationByQuery = async (query: { donorId: Condition<Schema.Types.ObjectId>, date: number }): Promise<{data?:IPlateletDonation, message: string, status: string}> => {
    const data: IPlateletDonation | null = await PlateletDonationModel.findOneAndDelete(query)
    if (data) {
        return {
            data,
            message: 'Platelet donation removed successfully',
            status: 'OK'
        }
    } else {
        return {
            message: 'Could not remove platelet donation',
            status: 'ERROR'
        }
    }
}

export const findLatestPlateletDonationByDonorId = async (id: Condition<Schema.Types.ObjectId>): Promise<{data?: IPlateletDonation[], message: string, status: string}> => {
    const data: IPlateletDonation[] = await PlateletDonationModel.find({donorId: id}).sort({date: -1}).limit(1)
    if (data.length !== 0) {
        return {
            message: 'Max platelet donation fetched successfully',
            status: 'OK',
            data
        }
    }
    return {
        message: 'No donations found',
        status: 'ERROR'
    }
}

export const insertManyPlateletDonations = async (donations: IPlateletDonation[]): Promise<{data: IPlateletDonation[], message: string, status: string}> => {
    const data: IPlateletDonation[] = await PlateletDonationModel.insertMany(donations)
    return {
        message: 'Platelet donations inserted successfully',
        status: 'OK',
        data
    }
}

export const getPlateletDonationCount = async ():Promise<{message: string, status: string, data: number}> => {
    const plateletDonationCount: number = await PlateletDonationModel.countDocuments()
    return {
        message: 'Fetched platelet donation count',
        status: 'OK',
        data: plateletDonationCount
    }
}

export interface IPlateletDonationCountByBloodGroup {
    bloodGroup: number
    counts: {
        month: number,
        year: number,
        count: number
    }[]
}

export const getPlateletDonationCountByTimePeriod = async (startTime: number, endTime: number): Promise<{message: string, status: string, data: IPlateletDonationCountByBloodGroup[]}> =>{
    const plateletDonationCountByMonthAndBlood: IPlateletDonationCountByBloodGroup[] = await PlateletDonationModel.aggregate([
        {
            $match: {
                date: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        },
        {
            $lookup: {
                from: "donors",
                localField: "donorId",
                foreignField: "_id",
                as: "donor"
            }
        },
        {
            $unwind: "$donor"
        },
        {
            $group: {
                _id: {
                    bloodGroup: "$donor.bloodGroup",
                    month: { $month: { $toDate: "$date" } },
                    year: { $year: { $toDate: "$date" } }
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.bloodGroup",
                counts: {
                    $push: {
                        month: "$_id.month",
                        year: "$_id.year",
                        count: "$count"
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                bloodGroup: "$_id",
                counts: 1
            }
        }
    ])
    return {
        message: 'Fetched platelet donation count by month and blood group',
        status: 'OK',
        data: plateletDonationCountByMonthAndBlood
    }
}

export type PlateletYearMonthCount = {
    [year: string]: {
        [month: string]: number;
    };
};
export const getPlateletDonationCountGroupedByYear = async (): Promise<{message: string, status: string, data: PlateletYearMonthCount}> =>{
    const plateletDonationCountByYearMonth: PlateletYearMonthCount[] = await PlateletDonationModel.aggregate([
        {
            $project: {
                year: { $toString: { $year: { $toDate: "$date" } } },
                month: { $toString: { $month: { $toDate: "$date" } } }
            }
        },
        {
            $group: {
                _id: { year: "$year", month: "$month" },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.year",
                counts: {
                    $push: {
                        k: "$_id.month",
                        v: "$count"
                    }
                }
            }
        },
        {
            $addFields: {
                counts: { $arrayToObject: "$counts" }
            }
        },
        {
            $project: {
                _id: 0,
                year: "$_id",
                counts: 1
            }
        },
        {
            $group: {
                _id: null,
                years: {
                    $push: {
                        k: "$year",
                        v: "$counts"
                    }
                }
            }
        },
        {
            $replaceRoot: {
                newRoot: { $arrayToObject: "$years" }
            }
        }
    ])

    return {
        message: 'Fetched platelet donation count by year and month',
        status: 'OK',
        data: plateletDonationCountByYearMonth.length > 0 ? plateletDonationCountByYearMonth[0] : {}
    }
}

