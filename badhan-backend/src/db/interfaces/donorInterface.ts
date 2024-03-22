import {DonorModel, IDonor} from '../models/Donor'
import {Schema} from "mongoose";
import {PipelineStage} from "mongoose";
import { ObjectId } from 'bson';

export const insertDonor = async (phone: number, bloodGroup: number, hall: number, name: string, studentId: string, address: string, roomNumber: string, lastDonation: number, comment: string, availableToAll: boolean):Promise<{data: IDonor, message: string, status: string}> => {
    const donor: IDonor = new DonorModel({phone, bloodGroup, hall, name, studentId, address, roomNumber, lastDonation: 0, comment, availableToAll})
    const data: IDonor = await donor.save()
    return {
        message: 'Donor insertion successful',
        status: 'OK',
        data
    }
}

export const deleteDonorById = async (donorId: Schema.Types.ObjectId): Promise<{data?: IDonor, message: string, status: string}> => {
    const data: IDonor | null = await DonorModel.findOneAndDelete({_id: donorId})
    if (data) {
        return {
            data,
            message: 'Donor removed successfully',
            status: 'OK'
        }
    } else {
        return {
            message: 'Could not remove donor',
            status: 'ERROR'
        }
    }
}

export const findDonorById = async (id: Schema.Types.ObjectId): Promise<{message: string, status: string, data?: IDonor}> => {
    const data: IDonor | null = await DonorModel.findById(id)
    if (data) {
        return {
            data,
            message: 'Donor found',
            status: 'OK'
        }
    } else {
        return {
            message: 'Donor not found',
            status: 'ERROR'
        }
    }
}

export const findDonorByQuery = async (query: { _id: string | Schema.Types.ObjectId } | { phone: number }): Promise<{data?: IDonor, message: string, status: string}> => {
    const data: IDonor | null = await DonorModel.findOne(query)
    if (data) {
        return {
            data,
            message: 'Donor found',
            status: 'OK'
        }
    } else {
        return {
            message: 'Donor not found',
            status: 'ERROR'
        }
    }
}

export const findDonorByPhone = async (phoneNumber: number): Promise<{data?: IDonor, message: string, status: string}> => {
    const data: IDonor | null = await DonorModel.findOne({
        phone: phoneNumber
    })

    if (data) {
        return {
            data,
            message: 'Donor fetched successfully',
            status: 'OK'
        }
    }

    return {
        message: 'Donor not found',
        status: 'ERROR'
    }
}

export const findAllDesignatedDonors = async ():Promise<{data: IDonor[], message: string, status: string}> => {
    const data: IDonor[] = await DonorModel.find({}, {
        name: 1,
        hall: 1,
        studentId: 1
    }).populate({path: 'logCount'})
    return {
        data,
        message: 'Volunteers fetched successfully',
        status: 'OK'
    }
}

export const findDonorsByAggregate = async (reqQuery: {
    bloodGroup: number,
    hall: number,
    batch: string,
    name: string,
    address: string,
    isAvailable: boolean,
    isNotAvailable: boolean,
    availableToAll: boolean
}): Promise<{data: IDonor[], message: string, status: string}> => {
    const queryBuilder: IQueryBuilder = generateSearchQuery(reqQuery)
    const data: IDonor[] = await DonorModel.aggregate([{
        $match: queryBuilder
    }, {
        $lookup: {
            from: 'donations',
            localField: '_id',
            foreignField: 'donorId',
            as: 'donations'
        }
    }, {
        $lookup: {
            from: 'callrecords',
            localField: '_id',
            foreignField: 'calleeId',
            as: 'callRecords'
        }
    }, {
        $lookup: {
            from: 'activedonors',
            localField: '_id',
            foreignField: 'donorId',
            as: 'activeDonors'
        }
    },
        {
            $addFields: {
                donationCount: {$size: '$donations'},
                callRecordCount: {$size: '$callRecords'},
                markerId: {$arrayElemAt: ['$activeDonors.markerId', 0]},
                lastCalled: {$max: '$callRecords.date'}
            }
        },
        {
            $lookup: {
                from: 'donors',
                localField: 'markerId',
                foreignField: '_id',
                as: 'markerDetails'
            }
        },
        {
            $addFields: {
                'marker.name': {$arrayElemAt: ['$markerDetails.name', 0]},
                'marker.time': {$arrayElemAt: ['$activeDonors.time', 0]}
            }
        },
        {
            $sort: {
                donationCount: -1,
                callRecordCount: -1
            }
        },
        {
            $project: {
                activeDonors: 0,
                callRecords: 0,
                donations: 0,
                email: 0,
                markerDetails: 0,
                designation: 0,
                markerId: 0,
                password: 0
            }
        }
    ])
    return {
        data,
        message: 'Donors fetched successfully',
        status: 'OK'
    }
}

export const findDonorAndUpdate = async (query: { hall: number, designation: number }, donorUpdate: { $set: { designation: number } }): Promise<{data?: IDonor, message: string, status: string}> => {
    const data: IDonor | null = await DonorModel.findOneAndUpdate(query, donorUpdate, {
        returnOriginal: false
    })
    if (data) {
        return {
            data,
            status: 'OK',
            message: 'Donor updated successfully'
        }
    } else {
        return {
            status: 'ERROR',
            message: 'Donor not found'
        }
    }
}

export const getCount = async (): Promise<{message: string, status: string, data: number}> => {
    const donorCount: number = await DonorModel.countDocuments()
    return {
        message: 'Fetched donor count',
        status: 'OK',
        data: donorCount
    }
}

export const getVolunteerCount = async (): Promise<{message: string, status: string, data: number}> => {
    const volunteerCount: number = await DonorModel.find({designation: 1}).countDocuments()
    return {
        message: 'Fetched volunteer count',
        status: 'OK',
        data: volunteerCount
    }
}

export const findAdmins = async (designation: number): Promise<{data: IDonor[], message: string, status: string}> => {
    const data: IDonor[] = await DonorModel.find({designation}, {
        studentId: 1,
        name: 1,
        phone: 1,
        hall: 1
    })
    const message: string = data.length > 0 ? 'Donor(s) found' : 'Donor not found'
    return {
        data,
        message,
        status: 'OK'
    }
}

export const findVolunteersOfHall = async (hall: number): Promise<{data: IDonor[], message: string, status: string}> => {
    const data: IDonor[] = await DonorModel.aggregate([{
        $match: {
            hall,
            designation: 1
        }
    }, {
        $lookup: {
            from: 'logs',
            localField: '_id',
            foreignField: 'donorId',
            as: 'logs'
        }
    }, {
        $addFields: {
            logCount: {$size: '$logs'}
        }
    },
        {
            $sort: {
                logCount: -1
            }
        },
        {
            $project: {
                studentId: 1,
                name: 1,
                roomNumber: 1,
                bloodGroup: 1,
                phone: 1
            }
        }
    ])
    const message: string = data.length > 0 ? 'Donor(s) found' : 'Donor not found'
    return {
        data,
        message,
        status: 'OK'
    }
}

export const generateAggregatePipeline = (reqQuery: {
    bloodGroup: number,
    hall: number,
    batch: string,
    name: string,
    address: string,
    isAvailable: boolean,
    isNotAvailable: boolean,
    availableToAll: boolean,
    markedByMe: boolean
}, donorId: Schema.Types.ObjectId) : PipelineStage[] => {
    const queryBuilder: IQueryBuilder = generateSearchQuery(reqQuery)
    const aggregatePipeline: PipelineStage[] = [{
        $lookup: {
            from: 'donors',
            localField: 'donorId',
            foreignField: '_id',
            as: 'donorDetails'
        }
    }, {
        $addFields: {
            donorDetails: {$first: '$donorDetails'}
        }
    }, {
        $project: {
            markerId: 1,
            _id: '$donorDetails._id',
            hall: '$donorDetails.hall',
            name: '$donorDetails.name',
            address: '$donorDetails.address',
            comment: '$donorDetails.comment',
            commentTime: '$donorDetails.commentTime',
            lastDonation: '$donorDetails.lastDonation',
            availableToAll: '$donorDetails.availableToAll',
            bloodGroup: '$donorDetails.bloodGroup',
            studentId: '$donorDetails.studentId',
            phone: '$donorDetails.phone',
            markedTime: '$time'
        }
    }, {
        $match: queryBuilder
    }, {
        $lookup: {
            from: 'donors',
            localField: 'markerId',
            foreignField: '_id',
            as: 'markerDetails'
        }
    }, {
        $addFields: {
            markerName: {$first: '$markerDetails.name'}
        }
    }, {
        $lookup: {
            from: 'donations',
            localField: '_id',
            foreignField: 'donorId',
            as: 'donations'
        }
    }, {
        $lookup: {
            from: 'callrecords',
            localField: '_id',
            foreignField: 'calleeId',
            as: 'callRecords'
        }
    }, {
        $addFields: {
            donationCount: {$size: '$donations'}
        }
    }, {
        $addFields: {
            callRecordCount: {$size: '$callRecords'},
            lastCallRecord: {$max: '$callRecords.date'}
        }
    }, {
        $project: {
            markerDetails: 0,
            markerId: 0,
            donations: 0,
            callRecords: 0
        }
    }
    ]

    if (reqQuery.markedByMe) {
        aggregatePipeline.splice(0, 0, {
            $match: {
                markerId: donorId
            }
        })
    }
    return aggregatePipeline
}

interface IQueryBuilder {
    bloodGroup?: number
    hall?: number
    availableToAll?: boolean
    studentId?: { $regex: string, $options: string }
    name?: { $regex: string, $options: string }
    $and?: {
        $or: {
            comment?: { $regex: string, $options: string },
            address?: { $regex: string, $options: string },
            hall?: number,
            availableToAll?: boolean,
        }[] | {
            lastDonation?: { $lt?: number, $gt?: number }
        }[]
    }[]
}

export const generateSearchQuery = (reqQuery: {
    bloodGroup: number,
    hall: number,
    batch: string,
    name: string,
    address: string,
    isAvailable: boolean,
    isNotAvailable: boolean,
    availableToAll: boolean
    availableToAllOrHall?: boolean
}): IQueryBuilder => {
    const queryBuilder: IQueryBuilder = {}

    // process blood group
    if (reqQuery.bloodGroup !== -1) {
        queryBuilder.bloodGroup = reqQuery.bloodGroup
    }

    // process hall
    // if the availableToAll is true, then there is no need to search using hall
    // otherwise, hall must be included

    if (reqQuery.availableToAllOrHall) {
        // do something later
    } else if (!reqQuery.availableToAll) {
        queryBuilder.hall = reqQuery.hall
    } else {
        queryBuilder.availableToAll = reqQuery.availableToAll
    }

    // process batch
    let batchRegex: string = '.......'
    if (reqQuery.batch !== '') {
        batchRegex = reqQuery.batch + '.....'
    }
    queryBuilder.studentId = {$regex: batchRegex, $options: 'ix'}

    // process name
    let nameRegex: string = '.*'

    for (let i: number = 0; i < reqQuery.name.length; i++) {
        nameRegex += (reqQuery.name.charAt(i) + '.*')
    }

    queryBuilder.name = {$regex: nameRegex, $options: 'ix'}

    // process address
    const addressRegex:string = '.*' + reqQuery.address + '.*'
    queryBuilder.$and = [{
        $or: [
            {comment: {$regex: addressRegex, $options: 'ix'}},
            {address: {$regex: addressRegex, $options: 'ix'}}]
    }
    ]

    if (reqQuery.availableToAllOrHall) {
        queryBuilder.$and.push({
                $or: [{
                    hall: reqQuery.hall
                }, {
                    availableToAll: true
                }]
            }
        )
    }

    const availableLimit: number = new Date().getTime() - 120 * 24 * 3600 * 1000

    const lastDonationAvailability: { lastDonation?: { $lt?: number, $gt?: number } }[] = []

    if (reqQuery.isAvailable) {
        lastDonationAvailability.push({
            lastDonation: {$lt: availableLimit}
        })
    }

    if (reqQuery.isNotAvailable) {
        lastDonationAvailability.push({
            lastDonation: {$gt: availableLimit}
        })
    }

    if (reqQuery.isNotAvailable || reqQuery.isAvailable) {
        queryBuilder.$and.push({$or: lastDonationAvailability})
    }
    return queryBuilder
}

export const findDonorIdsByPhone = async (userDesignation: number, userHall: number, phoneList: number[]): Promise<{donors: IDonor[], message: string, status: string}> => {
    // phoneList = [8801521438557, 8801786433743, 8801627151097]
    let existingDonors: IDonor[]
    if (userDesignation === 3) {
        existingDonors = await DonorModel.aggregate([
            {
                $match: {
                    phone: {$in: phoneList}
                }
            },
            {
                $project: {
                    phone: 1,
                    _id: 0,
                    donorId: '$_id'
                }
            }
        ])
    } else {
        existingDonors = await DonorModel.aggregate([
            {
                $match: {
                    phone: {$in: phoneList}
                }
            },
            {
                $project: {
                    phone: 1,
                    _id: 0,
                    donorId: {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $eq: ['$hall', userHall]
                                    },
                                    {
                                        $gt: ['$hall', 6]
                                    },
                                    {
                                        $eq: ['$availableToAll', true]
                                    }]
                            }, '$_id', 'FORBIDDEN'
                        ]
                    }
                }
            }
        ])
    }
    return {
        message: 'Existing donors fetched successfully',
        status: 'OK',
        donors: existingDonors
    }
}

export const getCreationCountBetweenTimeStamps = async (startTime: number, endTime: number): Promise<{data: number, message: string, status: string}> => {
    const startId: ObjectId = new ObjectId(Math.floor(startTime / 1000).toString(16) + "0000000000000000");
    const endId: ObjectId = new ObjectId(Math.floor(endTime / 1000).toString(16) + "0000000000000000");

    const newDonorCount: number = await DonorModel.countDocuments({
        _id: {
            $gte: startId,
            $lt: endId
        }
    });

    return {
        data: newDonorCount,
        message: 'Count of newly created donors fetched',
        status: 'OK'
    }
}
