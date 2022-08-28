// @ts-nocheck
// tslint:disable
import {IDonation} from "../models/Donation";
import {DonationModel} from "../models/Donation";
import {Schema} from 'mongoose'

export const insertDonation = async (donationObject: IDonation) => {
    const donation = new DonationModel(donationObject)
    const data = await donation.save()

    return {
        data,
        message: 'Donation insertion successful',
        status: 'OK'
    }
}

export const deleteDonationByQuery = async (query: { donorId: Schema.Types.ObjectId, date: number }) => {
    const data = await DonationModel.findOneAndDelete(query)
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

export const findMaxDonationByDonorId = async (id: Schema.Types.ObjectId) => {
    const data = await DonationModel.find({donorId: id}).sort({date: -1}).limit(1)
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

export const insertManyDonations = async (donations: IDonation[]) => {
    const data = await DonationModel.insertMany(donations)
    return {
        message: 'Donations inserted successfully',
        status: 'OK',
        data
    }
}

export const getCount = async () => {
    const donationCount = await DonationModel.countDocuments()
    return {
        message: 'Fetched donation count',
        status: 'OK',
        data: donationCount
    }
}

