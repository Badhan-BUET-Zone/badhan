export const getCountOfDonorsWhoDonatedPlateletForTheFirstTime = async (startTime: number, endTime: number): Promise<{data: number, message: string, status: string}> => {
    const result:{numberOfFirstPlateletDonations: number}[] = await DonorModel.aggregate([
    {
        $lookup: {
            from: "plateletdonations",
            localField: "_id",
            foreignField: "donorId",
            as: "donor_platelet_donations"
        }
    },
    {
        $unwind: "$donor_platelet_donations"
    },
    {
        $group: {
            _id: "$_id",
            firstPlateletDonationTime: { $min: "$donor_platelet_donations.date" }
        }
    },
    {
        $match: {
            firstPlateletDonationTime: {
                $gte: startTime,
                $lte: endTime
            }
        }
    },
    {
        $count: "numberOfFirstPlateletDonations"
    }
    ])

    return {
        data: result[0] ? result[0].numberOfFirstPlateletDonations : 0,
        message: 'Successfully fetched count of donors who donated platelet for the first time between timestamps',
        status: 'OK'
    }
}

// Same first-time platelet-donor count as getCountOfDonorsWhoDonatedPlateletForTheFirstTime, grouped per hall.
// Returns a map of hall index -> count; halls with no first-time platelet donors are simply absent.
export const getCountOfDonorsWhoDonatedPlateletForTheFirstTimeGroupedByHall = async (startTime: number, endTime: number): Promise<{data: Record<number, number>, message: string, status: string}> => {
    const result:{_id: number, count: number}[] = await DonorModel.aggregate([
    {
        $lookup: {
            from: "plateletdonations",
            localField: "_id",
            foreignField: "donorId",
            as: "donor_platelet_donations"
        }
    },
    {
        $unwind: "$donor_platelet_donations"
    },
    {
        $group: {
            _id: "$_id",
            firstPlateletDonationTime: { $min: "$donor_platelet_donations.date" },
            hall: { $first: "$hall" }
        }
    },
    {
        $match: {
            firstPlateletDonationTime: {
                $gte: startTime,
                $lte: endTime
            }
        }
    },
    {
        $group: {
            _id: "$hall",
            count: { $sum: 1 }
        }
    }
    ])

    const data: Record<number, number> = {}
    result.forEach((entry: {_id: number, count: number}): void => {
        data[entry._id] = entry.count
    })
    return {
        data,
        message: 'Successfully fetched hallwise count of donors who donated platelet for the first time between timestamps',
        status: 'OK'
    }
}
import { Types } from 'mongoose';
import {DonorModel, IDonor} from '../models/Donor'
import {Schema} from "mongoose";
import {PipelineStage} from "mongoose";
import { BLOOD_GROUP_ANY, DESIGNATIONS_INDEX, HALLS_INDEX } from '../../constants'


/**
 * Find donors created between the given times using ObjectId timestamp.
 * Accepts startTime and endTime as UNIX timestamps in ms or s.
 * Returns donors with an additional 'created' field (ms since epoch) derived from _id.
 */
export const findDonorsCreatedBetween = async (
    startTime: number,
    endTime: number
): Promise<{ data: (IDonor & { created: number })[]; message: string; status: string }> => {
    // Normalize times to ms
    let startMs: number = Number(startTime);
    let endMs: number = Number(endTime);
    if (startMs < 1e12) startMs *= 1000; // seconds -> ms
    if (endMs < 1e12) endMs *= 1000; // seconds -> ms

    // Build ObjectId bounds (ObjectId timestamp is in seconds)
    const startObjId: Types.ObjectId = Types.ObjectId.createFromTime(Math.floor(startMs / 1000));
    const endObjId: Types.ObjectId = Types.ObjectId.createFromTime(Math.floor(endMs / 1000) + 1); // +1 sec to be inclusive

    const data: (IDonor & { created: number })[] = await DonorModel.aggregate([
        {
            $match: {
                _id: {
                    $gte: startObjId,
                    $lt: endObjId
                }
            }
        },
        {
            $addFields: {
                // Convert ObjectId to Date then to epoch ms number
                created: { $toLong: { $toDate: '$_id' } }
            }
        },
        {
            $project: {
                password: 0
            }
        }
    ]) as unknown as (IDonor & { created: number })[];

    return {
        data,
        message: 'Donors found in creation time range',
        status: 'OK'
    };
};

export const insertDonor = async (phone: number, bloodGroup: number, hall: number, name: string, studentId: string, address: string, roomNumber: string, comment: string, availableToAll: boolean, fatherName: string, motherName: string):Promise<{data: IDonor, message: string, status: string}> => {
    const donor: IDonor = new DonorModel({phone, bloodGroup, hall, name, studentId, address, roomNumber, comment, availableToAll, fatherName, motherName})
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

export interface IPublicDonorProfile {
    name: string
    phone: number
    studentId: string
    bloodGroup: number
    hall: number
    donationCount: number
    plateletDonationCount: number
    lastDonation: number
    lastPlateletDonation: number
}

/**
 * The nine fields a donor may see about themselves without a session, plus nothing else.
 *
 * Anyone who knows both a phone number and a student id can read this, so what is *not*
 * here is the point: no address, room number, email, comment, call record, designation,
 * availableToAll, archiveFlag or donation list.
 *
 * The $project below is an INCLUSION projection deliberately. A field added to the Donor
 * schema later is then invisible here by default; an exclusion projection would leak it
 * the day it was added.
 *
 * Archived donors match normally — archiving is a search behaviour, not a record state —
 * so there is no archiveFlag filter.
 *
 * Counts come from the collections rather than from a field: extra donations recorded at
 * donor creation are materialised as real Donations rows, so $size is the true count.
 */
export const findPublicDonorProfile = async (phone: number, studentId: string): Promise<{data?: IPublicDonorProfile, message: string, status: string}> => {
    const matches: IPublicDonorProfile[] = await DonorModel.aggregate([
        {
            $match: { phone, studentId }
        }, {
            $lookup: {
                from: 'donations',
                localField: '_id',
                foreignField: 'donorId',
                as: 'donations'
            }
        }, {
            $lookup: {
                from: 'plateletdonations',
                localField: '_id',
                foreignField: 'donorId',
                as: 'plateletDonations'
            }
        }, {
            $project: {
                _id: 0,
                name: 1,
                phone: 1,
                studentId: 1,
                bloodGroup: 1,
                hall: 1,
                donationCount: { $size: '$donations' },
                plateletDonationCount: { $size: '$plateletDonations' },
                lastDonation: { $ifNull: [{ $max: '$donations.date' }, 0] },
                lastPlateletDonation: { $ifNull: [{ $max: '$plateletDonations.date' }, 0] }
            }
        }
    ])

    // Not exactly one match is a failure, not a pick-the-first. `phone` is unique in the
    // schema so two matches should be unreachable, but duplicate records are exactly the
    // mess this feature has to survive, and answering from the wrong one is worse than
    // answering not-found.
    if (matches.length !== 1) {
        return {
            message: 'Donor not found',
            status: 'ERROR'
        }
    }

    return {
        data: matches[0],
        message: 'Donor fetched successfully',
        status: 'OK'
    }
}

export const findAllDonors = async (archiveFlag: boolean):Promise<{data: IDonor[], message: string, status: string}> => {
    // archiveFlag leads the { archiveFlag, hall, bloodGroup } index, so this partitions
    // instead of scanning the collection. It is named in the inclusion projection too, or
    // every row comes back with archiveFlag undefined.
    const data: IDonor[] = await DonorModel.find({ archiveFlag }, {
        name: 1,
        hall: 1,
        studentId: 1,
        designation: 1,
        archiveFlag: 1
    }).populate({path: 'logCount'})
    return {
        data,
        message: 'Donors fetched successfully',
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
        availableToAll: boolean,
        archiveFlag: boolean
    }): Promise<{data: IDonor[], message: string, status: string}> => {
        const queryBuilder: IQueryBuilder = generateSearchQuery(reqQuery)
        const now: number = Date.now()
        const bloodLimit: number = now - 120 * 24 * 3600 * 1000
        const plateletLimit: number = now - 12 * 24 * 3600 * 1000
        const threeDaysAgo: number = now - 3 * 24 * 60 * 60 * 1000

        // Build pipeline step by step
        const pipeline: any[] = []

        // 1. Match donors based on search query
        pipeline.push({ $match: queryBuilder })

        // 2. Lookup blood donations for each donor
        pipeline.push({
            $lookup: {
                from: 'donations',
                localField: '_id',
                foreignField: 'donorId',
                as: 'donations'
            }
        })

        // 3. Lookup platelet donations for each donor
        pipeline.push({
            $lookup: {
                from: 'plateletdonations',
                localField: '_id',
                foreignField: 'donorId',
                as: 'plateletDonations'
            }
        })

        // 4. Add last donation dates for blood and platelet
        pipeline.push({
            $addFields: {
                lastDonation: { $ifNull: [{ $max: '$donations.date' }, 0] },
                lastPlateletDonation: { $ifNull: [{ $max: '$plateletDonations.date' }, 0] }
            }
        })

        // 5. Filter by availability (always push, empty $or means no donors)
        const availabilityConditions: any[] = [];

        if (reqQuery.isAvailable) {
            // Donor is available for both blood and platelet
            const availableCondition: any = {
                $and: [
                    { $lt: [ '$lastDonation', bloodLimit ] },
                    { $lt: [ '$lastPlateletDonation', plateletLimit ] }
                ]
            };
            availabilityConditions.push(availableCondition);
        }

        if (reqQuery.isNotAvailable) {
            // Donor is not available for either blood or platelet
            const notAvailableCondition: any = {
                $or: [
                    { $gt: [ '$lastDonation', bloodLimit ] },
                    { $gt: [ '$lastPlateletDonation', plateletLimit ] }
                ]
            };
            availabilityConditions.push(notAvailableCondition);
        }

        pipeline.push({
            $match: {
                $expr: {
                    $or: availabilityConditions
                }
            }
        });

        // 6. Lookup call records for each donor
        pipeline.push({
            $lookup: {
                from: 'callrecords',
                localField: '_id',
                foreignField: 'calleeId',
                as: 'callRecords'
            }
        })

        // 7. Lookup active donor markers for each donor
        pipeline.push({
            $lookup: {
                from: 'activedonors',
                localField: '_id',
                foreignField: 'donorId',
                as: 'activeDonors'
            }
        })

        // 8. Add computed fields: donation count, call record count, markerId, last called, call count in last 3 days
        pipeline.push({
            $addFields: {
                donationCount: { $size: '$donations' },
                plateletDonationCount: { $size: '$plateletDonations' },
                callRecordCount: { $size: '$callRecords' },
                markerId: { $arrayElemAt: ['$activeDonors.markerId', 0] },
                lastCalled: { $max: '$callRecords.date' },
                callCountLast3Days: {
                    $size: {
                        $filter: {
                            input: '$callRecords',
                            as: 'record',
                            cond: { $gte: ['$$record.date', threeDaysAgo] }
                        }
                    }
                }
            }
        })

        // 9. Lookup marker details (name) for each donor
        pipeline.push({
            $lookup: {
                from: 'donors',
                localField: 'markerId',
                foreignField: '_id',
                as: 'markerDetails'
            }
        })

        // 10. Add marker name and marker time fields
        pipeline.push({
            $addFields: {
                'marker.name': { $arrayElemAt: ['$markerDetails.name', 0] },
                'marker.time': { $arrayElemAt: ['$activeDonors.time', 0] }
            }
        })

        // 11. Sort donors by donation count and call record count (descending)
        pipeline.push({
            $sort: {
                donationCount: -1,
                callRecordCount: -1
            }
        })

        // 12. Project: remove sensitive and unnecessary fields from output
        pipeline.push({
            $project: {
                activeDonors: 0,
                callRecords: 0,
                donations: 0,
                plateletDonations: 0,
                email: 0,
                markerDetails: 0,
                designation: 0,
                markerId: 0,
                password: 0
            }
        })

        // Run the aggregation pipeline
        const data: IDonor[] = await DonorModel.aggregate(pipeline)
        return {
            data,
            message: 'Donors fetched successfully',
            status: 'OK'
        }
    }

export const findDonorAndUpdate = async (query: { hall: number, designation: number }, donorUpdate: { $set: { designation: number } }): Promise<{data?: IDonor, message: string, status: string}> => {
    // runValidators: mongoose enforces `required`, `min`/`max` and the schema's own validators only
    // when a document is validated — `save()`. An update statement bypasses all of it by default,
    // which is how a donor could end up with no designation at all. Update validators run only for
    // the paths named in the update, so this cannot trip over an unrelated legacy field.
    const data: IDonor | null = await DonorModel.findOneAndUpdate(query, donorUpdate, {
        returnOriginal: false,
        runValidators: true
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
    const volunteerCount: number = await DonorModel.find({designation: DESIGNATIONS_INDEX.VOLUNTEER}).countDocuments()
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
            designation: DESIGNATIONS_INDEX.VOLUNTEER
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
    const now: number = Date.now()
    const bloodLimit: number = now - 120 * 24 * 3600 * 1000
    const plateletLimit: number = now - 12 * 24 * 3600 * 1000
    const threeDaysAgo: number = Date.now() - 3 * 24 * 60 * 60 * 1000;
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
            availableToAll: '$donorDetails.availableToAll',
            // display only, for the PersonCardNew "Archived" chip: this is an inclusion projection,
            // so an unnamed field never reaches the card. No $match is ever added here — the active
            // donors list keeps returning archived donors exactly as before.
            archiveFlag: '$donorDetails.archiveFlag',
            bloodGroup: '$donorDetails.bloodGroup',
            studentId: '$donorDetails.studentId',
            phone: '$donorDetails.phone',
            markedTime: '$time'
        }
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
            from: 'plateletdonations',
            localField: '_id',
            foreignField: 'donorId',
            as: 'plateletDonations'
        }
    }, {
        $addFields: {
            lastDonation: { $ifNull: [{ $max: '$donations.date' }, 0] },
            lastPlateletDonation: { $ifNull: [{ $max: '$plateletDonations.date' }, 0] }
        }
    }, {
        $match: queryBuilder
    }, ...(reqQuery.isAvailable || reqQuery.isNotAvailable ? [{
        $match: {
            $expr: {
                $or: [
                    ...(reqQuery.isAvailable ? [{ $and: [ { $lt: [ '$lastDonation', bloodLimit ] }, { $lt: [ '$lastPlateletDonation', plateletLimit ] } ] }] : []),
                    ...(reqQuery.isNotAvailable ? [{ $or: [ { $gt: [ '$lastDonation', bloodLimit ] }, { $gt: [ '$lastPlateletDonation', plateletLimit ] } ] }] : [])
                ]
            }
        }
    }] : []), {
        $lookup: {
            from: 'callrecords',
            localField: '_id',
            foreignField: 'calleeId',
            as: 'callRecords'
        }
    }, {
        $addFields: {
            donationCount: { $size: '$donations' },
            plateletDonationCount: { $size: '$plateletDonations' }
        }
    }, {
        $addFields: {
            callRecordCount: {$size: '$callRecords'},
            lastCallRecord: {$max: '$callRecords.date'},
            callCountLast3Days: {
                $size: {
                    $filter: {
                        input: '$callRecords',
                        as: 'record',
                        cond: { $gte: ['$$record.date', threeDaysAgo] }
                    }
                }
            }
        }
    }, {
        $project: {
            markerDetails: 0,
            markerId: 0,
            donations: 0,
            plateletDonations: 0,
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
    archiveFlag?: boolean
    bloodGroup?: number
    hall?: number
    availableToAll?: boolean
    studentId?: { $regex: string, $options: string }
    name?: { $regex: string, $options: string }
    $and?: any[]
}

export const generateSearchQuery = (reqQuery: {
    bloodGroup: number,
    hall: number,
    batch: string,
    name: string,
    address: string,
    isAvailable: boolean,
    isNotAvailable: boolean,
    availableToAll: boolean,
    availableToAllOrHall?: boolean,
    archiveFlag?: boolean
}): IQueryBuilder => {
    const queryBuilder: IQueryBuilder = {}

    // process archive flag, first so the indexed equality leads the emitted $match.
    // The guard is load-bearing: generateAggregatePipeline (active donors) deliberately passes no
    // archiveFlag, and an unguarded assignment would still emit the key. The driver serializes
    // undefined to null (ignoreUndefined is off), so that $match would become archiveFlag: null and
    // match zero donors. The optional `?` is not a softening of the API contract — mandatoriness is
    // enforced at the edge by the tsoa signature and the .exists() validator, which every
    // /search/v3 request passes through before reaching here.
    if (typeof reqQuery.archiveFlag === 'boolean') {
        queryBuilder.archiveFlag = reqQuery.archiveFlag
    }

    // process blood group
    if (reqQuery.bloodGroup !== BLOOD_GROUP_ANY) {
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

    // Availability is computed in aggregation using donation lookups now.
    return queryBuilder
}

export const findDonorIdsByPhone = async (userDesignation: number, userHall: number, phoneList: number[]): Promise<{donors: IDonor[], message: string, status: string}> => {
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
                                        $gt: ['$hall', HALLS_INDEX.TITUMIR]
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

export const getCountOfDonorsWhoDonatedForTheFirstTime = async (startTime: number, endTime: number): Promise<{data: number, message: string, status: string}> => {
    const result:{numberOfFirstDonations: number}[] = await DonorModel.aggregate([
    {
        $lookup: {
            from: "donations",
            localField: "_id",
            foreignField: "donorId",
            as: "donor_donations"
        }
    },
    {
        $unwind: "$donor_donations"
    },
    {
        $group: {
            _id: "$_id",
            firstDonationTime: { $min: "$donor_donations.date" }
        }
    },
    {
        $match: {
            firstDonationTime: {
                $gte: startTime,
                $lte: endTime
            }
        }
    },
    {
        $count: "numberOfFirstDonations"
    }
    ])

    return {
        data: result[0] ? result[0].numberOfFirstDonations : 0,
        message: 'Successfully fected count of donors who donated for the first time between timestamps',
        status: 'OK'
    }
}

// Same first-time-donor count as getCountOfDonorsWhoDonatedForTheFirstTime, grouped per hall.
// Returns a map of hall index -> count; halls with no first-time donors are simply absent.
export const getCountOfDonorsWhoDonatedForTheFirstTimeGroupedByHall = async (startTime: number, endTime: number): Promise<{data: Record<number, number>, message: string, status: string}> => {
    const result:{_id: number, count: number}[] = await DonorModel.aggregate([
    {
        $lookup: {
            from: "donations",
            localField: "_id",
            foreignField: "donorId",
            as: "donor_donations"
        }
    },
    {
        $unwind: "$donor_donations"
    },
    {
        $group: {
            _id: "$_id",
            firstDonationTime: { $min: "$donor_donations.date" },
            hall: { $first: "$hall" }
        }
    },
    {
        $match: {
            firstDonationTime: {
                $gte: startTime,
                $lte: endTime
            }
        }
    },
    {
        $group: {
            _id: "$hall",
            count: { $sum: 1 }
        }
    }
    ])

    const data: Record<number, number> = {}
    result.forEach((entry: {_id: number, count: number}): void => {
        data[entry._id] = entry.count
    })
    return {
        data,
        message: 'Successfully fetched hallwise count of donors who donated for the first time between timestamps',
        status: 'OK'
    }
}
