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
  //     if(reqQuery.availableToAllOrHall){
  //         queryBuilder
  //     }

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
  generateAggregatePipeline,
  generateSearchQuery
}
