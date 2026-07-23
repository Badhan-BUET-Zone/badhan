import {IDonation} from "../models/Donation";
import {DonationModel} from "../models/Donation";
import { Condition } from 'mongoose'
import {Schema} from 'mongoose'
import { year2000TimeStamp } from '../../constants'

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

export const findLatestDonationByDonorId = async (id: Condition<Schema.Types.ObjectId>): Promise<{data?: IDonation[], message: string, status: string}> => {
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

// Counts only donations actually recorded through the app, excluding the backdated
// dummy donations inserted at donor creation time (all dated year2000TimeStamp).
export const getCountMadeByApp = async ():Promise<{message: string, status: string, data: number}> => {
    const donationCount: number = await DonationModel.countDocuments({ date: { $gt: year2000TimeStamp } })
    return {
        message: 'Fetched app donation count',
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

// Same monthly/blood-group breakdown as getDonationCountByTimePeriod, but grouped per hall.
// Returns a map of hall index -> report array; halls with no donations are simply absent.
export const getDonationCountByTimePeriodGroupedByHall = async (startTime: number, endTime: number): Promise<{message: string, status: string, data: Record<number, IDonationCountByBloodGroup[]>}> =>{
    const grouped: {hall: number, report: IDonationCountByBloodGroup[]}[] = await DonationModel.aggregate([
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
                    hall: "$donor.hall",
                    bloodGroup: "$donor.bloodGroup",
                    month: { $month: { $toDate: "$date" } },
                    year: { $year: { $toDate: "$date" } }
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: {
                    hall: "$_id.hall",
                    bloodGroup: "$_id.bloodGroup"
                },
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
            $group: {
                _id: "$_id.hall",
                report: {
                    $push: {
                        bloodGroup: "$_id.bloodGroup",
                        counts: "$counts"
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                hall: "$_id",
                report: 1
            }
        }
    ])
    const data: Record<number, IDonationCountByBloodGroup[]> = {}
    grouped.forEach((entry: {hall: number, report: IDonationCountByBloodGroup[]}): void => {
        data[entry.hall] = entry.report
    })
    return {
        message: 'Fetched hallwise donation count by month and blood group',
        status: 'OK',
        data
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

