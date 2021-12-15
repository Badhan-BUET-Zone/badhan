
const { Donor } = require('../models/Donor')
const insertDonor = async (donorObject) => {
  const donor = new Donor(donorObject)
  const data = await donor.save()

  if (data.nInserted === 0) {
    return {
      message: 'Donor insertion failed',
      status: 'ERROR',
      data: data
    }
  } else {
    return {
      message: 'Donor insertion successful',
      status: 'OK',
      data: data
    }
  }
}

const deleteDonor = async (donorID) => {
  const data = await Donor.findOneAndDelete({ _id: donorID })
  if (data) {
    return {
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

const deleteDonorByPhone = async (donorPhone) => {
  const data = await Donor.findOneAndDelete({ phone: donorPhone })
  if (data) {
    return {
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

const deleteDonorById = async (donorId) => {
  const data = await Donor.findOneAndDelete({ _id: donorId })
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
const findDonorById = async (id) => {
  const data = await Donor.findById(id)
  if (data) {
    return {
      data,
      message: 'Donor found',
      status: 'OK'
    }
  } else {
    return {
      data: null,
      message: 'Donor not found',
      status: 'ERROR'
    }
  }
}

const findDonorByQuery = async (query, option) => {
  const data = await Donor.findOne(query, option)
  if (data) {
    return {
      data,
      message: 'Donor found',
      status: 'OK'
    }
  } else {
    return {
      data: null,
      message: 'Donor not found',
      status: 'ERROR'
    }
  }
}

const findDonorByPhone = async (phoneNumber) => {
  const data = await Donor.findOne({
    phone: phoneNumber
  })

  if (data) {
    return {
      data: data,
      message: 'Donor fetched successfully',
      status: 'OK'
    }
  }

  return {
    data: data,
    message: 'Donor not found',
    status: 'ERROR'
  }
}

const findAllVolunteers = async () => {
  const data = await Donor.find({
    designation: 1
  }, {
    name: 1,
    hall: 1,
    studentId: 1
  }).populate({ path: 'logCount' })
  return {
    data,
    message: 'Volunteers fetched successfully',
    status: 'OK'
  }
}

const findDonorsByAggregate = async (reqQuery) => {
  const queryBuilder = generateSearchQuery(reqQuery)
  const data = await Donor.aggregate([{
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
      donationCount: { $size: '$donations' },
      callRecordCount: { $size: '$callRecords' },
      markerId: { $arrayElemAt: ['$activeDonors.markerId', 0] },
      lastCalled: { $max: '$callRecords.date' }
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
      'marker.name': { $arrayElemAt: ['$markerDetails.name', 0] },
      'marker.time': { $arrayElemAt: ['$activeDonors.time', 0] }
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

const findDonorsByQuery = async (reqQuery) => {
  const queryBuilder = generateSearchQuery(reqQuery)
  const data = await Donor.find(queryBuilder).populate({
    path: 'callRecords',
    select: { _id: 1, date: 1, callerId: 1 }
  }).populate({
    path: 'donationCountOptimized'
  }).populate({
    path: 'markedBy',
    select: {
      markerId: 1, time: 1, _id: 0
    },
    populate: {
      path: 'markerId',
      model: 'Donor',
      select: { name: 1 }
    }
  })

  return {
    data,
    message: 'Donors fetched successfully',
    status: 'OK'
  }
}
const findDonorByIDAndUpdateCommentTime = async (id, commentTime) => {
  const data = await Donor.findByIdAndUpdate(id, {
    $set: {
      commentTime
    }
  })

  if (data) {
    return {
      data,
      message: 'Comment time updated successfully',
      status: 'OK'
    }
  } else {
    return {
      data: null,
      message: 'Comment time update failed',
      status: 'ERROR'
    }
  }
}

const findDonorByIDAndUpdate = async (id, update) => {
  const data = await Donor.findByIdAndUpdate(id, update)

  if (data) {
    return {
      data,
      message: 'Donor updated successfully',
      status: 'OK'
    }
  } else {
    return {
      data: null,
      message: 'Donor update failed',
      status: 'ERROR'
    }
  }
}

const findDonorAndUpdate = async (query, donorUpdate) => {
  const data = await Donor.findOneAndUpdate(query, donorUpdate, {
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

const getCount = async () => {
  const donorCount = await Donor.countDocuments()
  return {
    message: 'Fetched donor count',
    status: 'OK',
    data: donorCount
  }
}

const getVolunteerCount = async () => {
  const volunteerCount = await Donor.find({ designation: 1 }).countDocuments()
  return {
    message: 'Fetched volunteer count',
    status: 'OK',
    data: volunteerCount
  }
}

const findAdmins = async (designation) => {
  const data = await Donor.find({ designation }, {
    studentId: 1,
    name: 1,
    phone: 1,
    hall: 1
  })
  const message = data.length > 0 ? 'Donor(s) found' : 'Donor not found'
  return {
    data,
    message,
    status: 'OK'
  }
}

const findVolunteersOfHall = async (hall) => {
  // const data = await Donor.find({ designation: 1, hall: hall }, {
  //   studentId: 1,
  //   name: 1,
  //   roomNumber: 1,
  //   bloodGroup: 1,
  //   phone: 1
  // })
  const data = await Donor.aggregate([{
    $match: {
      hall: hall,
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
      logCount: { $size: '$logs' }
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
  const message = data.length > 0 ? 'Donor(s) found' : 'Donor not found'
  return {
    data,
    message,
    status: 'OK'
  }
}

const generateAggregatePipeline = (reqQuery, donorId) => {
  const queryBuilder = generateSearchQuery(reqQuery)
  const aggregatePipeline = [{
    $lookup: {
      from: 'donors',
      localField: 'donorId',
      foreignField: '_id',
      as: 'donorDetails'
    }
  },
  {
    $addFields: {
      donorDetails: { $first: '$donorDetails' }
    }
  },
  {
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
  },
  {
    $match: queryBuilder
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
      markerName: { $first: '$markerDetails.name' }
    }
  },
  {
    $lookup: {
      from: 'donations',
      localField: '_id',
      foreignField: 'donorId',
      as: 'donations'
    }
  },
  {
    $lookup: {
      from: 'callrecords',
      localField: '_id',
      foreignField: 'calleeId',
      as: 'callRecords'
    }
  },
  {
    $addFields: {
      donationCount: { $size: '$donations' }
    }
  },
  {
    $addFields: {
      callRecordCount: { $size: '$callRecords' },
      lastCallRecord: { $max: '$callRecords.date' }
    }
  },
  {
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

const generateSearchQuery = (reqQuery) => {
  const queryBuilder = {}

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
  let batchRegex = '.......'
  if (reqQuery.batch !== '') {
    batchRegex = reqQuery.batch + '.....'
  }
  queryBuilder.studentId = { $regex: batchRegex, $options: 'ix' }

  // process name
  let nameRegex = '.*'

  for (let i = 0; i < reqQuery.name.length; i++) {
    nameRegex += (reqQuery.name.charAt(i) + '.*')
  }

  queryBuilder.name = { $regex: nameRegex, $options: 'ix' }

  // process address
  const addressRegex = '.*' + reqQuery.address + '.*'

  queryBuilder.$and = [{
    $or: [
      { comment: { $regex: addressRegex, $options: 'ix' } },
      { address: { $regex: addressRegex, $options: 'ix' } }]
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

  const availableLimit = new Date().getTime() - 120 * 24 * 3600 * 1000

  const lastDonationAvailability = []

  if (reqQuery.isAvailable) {
    lastDonationAvailability.push({
      lastDonation: { $lt: availableLimit }
    })
  }

  if (reqQuery.isNotAvailable) {
    lastDonationAvailability.push({
      lastDonation: { $gt: availableLimit }
    })
  }

  if (reqQuery.isNotAvailable || reqQuery.isAvailable) {
    queryBuilder.$and.push({ $or: lastDonationAvailability })
  }
  return queryBuilder
}

module.exports = {
  insertDonor,
  deleteDonor,
  deleteDonorByPhone,
  deleteDonorById,
  findDonorByQuery,
  findDonorsByQuery,
  findDonorByIDAndUpdate,
  findDonorAndUpdate,
  getCount,
  getVolunteerCount,
  findAllVolunteers,
  findDonorByPhone,
  findDonorByIDAndUpdateCommentTime,
  findDonorById,
  findAdmins,
  findVolunteersOfHall,
  findDonorsByAggregate,
  generateAggregatePipeline,
  generateSearchQuery
}
