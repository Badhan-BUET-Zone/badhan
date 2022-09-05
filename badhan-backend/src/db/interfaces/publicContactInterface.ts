import {IPublicContact, PublicContactModel} from "../models/PublicContact";
import mongoose from "mongoose";

export const insertPublicContact = async (donorId: mongoose.Types.ObjectId, bloodGroup: number): Promise<{data: IPublicContact, message: string, status: string}> => {
    const publicContact: IPublicContact = new PublicContactModel({donorId, bloodGroup})
    const data: IPublicContact = await publicContact.save()
    return {
        data,
        message: 'Public contact insertion successful',
        status: 'OK'
    }
}

export const deletePublicContactById = async (publicContactId: string): Promise<{data?:IPublicContact, status: string, message: string}> => {
    const data: IPublicContact|null = await PublicContactModel.findByIdAndDelete(publicContactId)
    if (data) {
        return {
            message: 'Public contact removed successfully',
            status: 'OK',
            data
        }
    }
    return {
        message: 'Could not remove public contact',
        status: 'ERROR'
    }
}

export const findPublicContactById = async (publicContactId: string): Promise<{data?: IPublicContact, message: string, status: string}> => {
    const data: IPublicContact| null = await PublicContactModel.findOne({
        _id: publicContactId
    })
    if (data) {
        return {
            data,
            message: 'Contact fetched successfully',
            status: 'OK'
        }
    }
    return {
        message: 'Contact not found',
        status: 'ERROR'
    }
}

export const findAllPublicContacts = async (): Promise<{data: IPublicContact[], message: string, status: string}> => {
    const data: IPublicContact[] = await PublicContactModel.aggregate([
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
                name: {$arrayElemAt: ['$donorDetails.name', 0]},
                donorId: '$donorId',
                bloodGroup: '$bloodGroup',
                contactId: '$_id',
                phone: {$arrayElemAt: ['$donorDetails.phone', 0]}
            }
        },
        {
            $group: {
                _id: {
                    bloodGroup: '$bloodGroup'
                },
                contacts: {$push: {donorId: '$donorId', phone: '$phone', name: '$name', contactId: '$contactId'}}
            }
        },
        {
            $project: {
                _id: 0,
                bloodGroup: '$_id.bloodGroup',
                contacts: '$contacts'
            }
        },
        {
            $sort: {
                bloodGroup: 1
            }
        }
    ])
    return {
        data,
        message: 'All public contacts fetched',
        status: 'ERROR'
    }
}
