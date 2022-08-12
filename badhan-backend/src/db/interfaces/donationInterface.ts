// @ts-nocheck
const { Donation } = require('../models/Donation')

const insertDonation = async (donationObject) => {
  const donation = new Donation(donationObject)
  const data = await donation.save()
  if (data.nInserted === 0) {
    return {

      message: 'Donation insertion failed',
      status: 'ERROR'
    }
  } else {
    return {
      data,
      message: 'Donation insertion successful',
      status: 'OK'
    }
  }
}

const deleteDonation = async (donationID) => {
  const data = await Donation.findOneAndDelete({ _id: donationID })
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

const deleteDonationByQuery = async (query) => {
  const data = await Donation.findOneAndDelete(query)
  if (data) {
    return {
      data,
      message: 'Donation removed successfully',
      status: 'OK'
    }
  } else {
    console.log('ERROR')
    return {
      message: 'Could not remove donation',
      status: 'ERROR'
    }
  }
}

const findMaxDonationByDonorId = async (id) => {
  const data = await Donation.find({ donorId: id }).sort({ date: -1 }).limit(1)
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

const deleteDonationsByQuery = async (query) => {
  const data = await Donation.deleteMany(query)
  if (data) {
    return {
      message: 'Donations removed successfully',
      status: 'OK',
      data
    }
  }
  return {
    message: 'Could not remove donations',
    status: 'ERROR'
  }
}

const insertManyDonations = async (donations) => {
  const data = await Donation.insertMany(donations)
  return {
    message: 'Donations inserted successfully',
    status: 'OK',
    data
  }
}

const findDonationByQuery = async (query, option) => {
  const data = await Donation.findOne(query, option)
  if (data) {
    return {
      data,
      message: 'Donation found',
      status: 'OK'
    }
  } else {
    return {
      data: null,
      message: 'Donation not found',
      status: 'ERROR'
    }
  }
}

const findDonationsByQuery = async (query, option) => {
  const data = await Donation.find(query, option)
  const message = data.length > 0 ? 'Donation(s) found' : 'Donation not found'
  return {
    data,
    message,
    status: 'OK'
  }
}

const getCount = async () => {
  const donationCount = await Donation.countDocuments()
  return {
    message: 'Fetched donation count',
    status: 'OK',
    data: donationCount
  }
}
module.exports = {
  insertDonation,
  deleteDonation,
  deleteDonationByQuery,
  deleteDonationsByQuery,
  findDonationByQuery,
  findDonationsByQuery,
  getCount,
  insertManyDonations,
  findMaxDonationByDonorId
}
