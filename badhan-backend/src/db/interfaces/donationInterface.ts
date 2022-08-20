// @ts-nocheck
/* tslint:disable */
import {DonationModel} from "../models/Donation";

export const insertDonation = async (donationObject) => {
  const donation = new DonationModel(donationObject)
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

export const deleteDonation = async (donationID) => {
  const data = await DonationModel.findOneAndDelete({ _id: donationID })
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

export const deleteDonationByQuery = async (query) => {
  const data = await DonationModel.findOneAndDelete(query)
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

export const findMaxDonationByDonorId = async (id) => {
  const data = await DonationModel.find({ donorId: id }).sort({ date: -1 }).limit(1)
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

export const deleteDonationsByQuery = async (query) => {
  const data = await DonationModel.deleteMany(query)
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

export const insertManyDonations = async (donations) => {
  const data = await DonationModel.insertMany(donations)
  return {
    message: 'Donations inserted successfully',
    status: 'OK',
    data
  }
}

export const findDonationByQuery = async (query, option) => {
  const data = await DonationModel.findOne(query, option)
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

export const findDonationsByQuery = async (query, option) => {
  const data = await DonationModel.find(query, option)
  const message = data.length > 0 ? 'Donation(s) found' : 'Donation not found'
  return {
    data,
    message,
    status: 'OK'
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

