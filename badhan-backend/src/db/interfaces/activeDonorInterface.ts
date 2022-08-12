// @ts-nocheck
const { generateAggregatePipeline } = require('./donorInterface')
const { ActiveDonor } = require('../models/ActiveDonor')

const add = async (donorId, markerId) => {
  const addedActiveDonor = new ActiveDonor({ donorId, markerId })
  const data = await addedActiveDonor.save()
  if (data.nInserted === 0) {
    return {
      message: 'Active donor insertion failed',
      status: 'ERROR'
    }
  }
  return {
    data,
    message: 'Active donor insertion successful',
    status: 'OK'
  }
}

const remove = async (donorId) => {
  const removedActiveDonor = await ActiveDonor.findOneAndDelete({ donorId })
  if (removedActiveDonor) {
    return {
      data: removedActiveDonor,
      message: 'Active donor removed successfully',
      status: 'OK'
    }
  }

  return {
    message: 'Active donor not found',
    status: 'ERROR'
  }
}

const findByDonorId = async (donorId) => {
  const activeDonors = await ActiveDonor.find({ donorId })
  if (activeDonors.length === 0) {
    return {
      message: 'Active donor not found',
      status: 'ERROR'
    }
  }
  return {
    data: activeDonors,
    status: 'OK',
    message: 'Active donor found'
  }
}
const findByQueryAndPopulate = async (reqQuery, donorId) => {
  const aggregatePipeline = generateAggregatePipeline(reqQuery, donorId)
  const activeDonors = await ActiveDonor.aggregate(aggregatePipeline)
  return {
    message: 'Active donors fetched with details',
    status: 'OK',
    data: activeDonors
  }
}

module.exports = {
  add,
  remove,
  findByDonorId,
  findByQueryAndPopulate
}
