import {IDonation} from "../models/Donation";
import {DonationModel} from "../models/Donation";
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

export const deleteDonationByQuery = async (query: { donorId: Schema.Types.ObjectId, date: number }): Promise<{data?:IDonation, message: string, status: string}> => {
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

export const findMaxDonationByDonorId = async (id: Schema.Types.ObjectId): Promise<{data?: IDonation[], message: string, status: string}> => {
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

