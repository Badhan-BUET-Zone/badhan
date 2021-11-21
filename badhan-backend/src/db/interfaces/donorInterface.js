import dbHelpers from '../dbHelpers'
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

const findDonorsByQuery = async (reqQuery) => {
  const queryBuilder = dbHelpers.generateSearchQuery(reqQuery)
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
  findVolunteersOfHall
}
