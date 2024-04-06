import {IDonation} from "../models/Donation";
import {DonationModel} from "../models/Donation";
import { Condition } from 'mongoose'
import {Schema} from 'mongoose'

export const insertDonation = async (phone: number, donorId: Schema.Types.ObjectId, date: number ): Promise<{data: IDonation, message: string, status: string}> => {
    const donation: IDonation = new DonationModel({phone, donorId, date})
    const data: IDonation = await donation.save()

    return {
        data,
        message: 'Donation insertion successful',
        status: 'OK'
    }
}

export const deleteDonationByQuery = async (query: { donorId: Condition<Schema.Types.ObjectId>, date: number }): Promise<{data?:IDonation, message: string, status: string}> => {
    const data: IDonation | null = await DonationModel.findOneAndDelete(query)
    if (data) {
        return {
            data,
            message: 'Donation removed successfully',
            status: 'OK'
        }
    } else {
        return {
            message: 'Could not remove donation',
            status: 'ERROR'
        }
    }
}

export const findMaxDonationByDonorId = async (id: Condition<Schema.Types.ObjectId>): Promise<{data?: IDonation[], message: string, status: string}> => {
    const data: IDonation[] = await DonationModel.find({donorId: id}).sort({date: -1}).limit(1)
    if (data.length !== 0) {
        return {
            message: 'Max donation fetched successfully',
            status: 'OK',
            data
        }
    }
    return {
        message: 'No donations found',
        status: 'ERROR'
    }
}

export const insertManyDonations = async (donations: IDonation[]): Promise<{data: IDonation[], message: string, status: string}> => {
    const data: IDonation[] = await DonationModel.insertMany(donations)
    return {
        message: 'Donations inserted successfully',
        status: 'OK',
        data
    }
}

export const getCount = async ():Promise<{message: string, status: string, data: number}> => {
    const donationCount: number = await DonationModel.countDocuments()
    return {
        message: 'Fetched donation count',
        status: 'OK',
        data: donationCount
    }
}

export interface IDonationCountByBloodGroup {
    bloodGroup: number
    counts: {
        month: number,
        year: number,
        count: number
    }[]
}

export const getDonationCountByTimePeriod = async (startTime: number, endTime: number): Promise<{message: string, status: string, data: IDonationCountByBloodGroup[]}> =>{
    const donationCountByMonthAndBlood: IDonationCountByBloodGroup[] = await DonationModel.aggregate([
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
        message: 'Fetched donation count by month and blood group',
        status: 'OK',
        data: donationCountByMonthAndBlood
    }
}

export type YearMonthCount = {
    [year: string]: {
        [month: string]: number;
    };
};
export const getDonationCountGroupedByYear = async (): Promise<{message: string, status: string, data: YearMonthCount}> =>{
    const donationCountByYearMonth: YearMonthCount[] = await DonationModel.aggregate([
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
        message: 'Fetched donation count by year and month',
        status: 'OK',
        data: donationCountByYearMonth.length > 0 ? donationCountByYearMonth[0] : {}
    }
}

