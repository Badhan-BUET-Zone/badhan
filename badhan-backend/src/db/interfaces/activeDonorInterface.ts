// @ts-nocheck
/* tslint:disable */
import { generateAggregatePipeline } from './donorInterface'

import {ActiveDonorModel} from "../models/ActiveDonor";
export const add = async (donorId, markerId) => {
  const addedActiveDonor = new ActiveDonorModel({ donorId, markerId })
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

export const remove = async (donorId) => {
  const removedActiveDonor = await ActiveDonorModel.findOneAndDelete({ donorId })
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

export const findByDonorId = async (donorId) => {
  const activeDonors = await ActiveDonorModel.find({ donorId })
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
export const findByQueryAndPopulate = async (reqQuery, donorId) => {
  const aggregatePipeline = generateAggregatePipeline(reqQuery, donorId)
  const activeDonors = await ActiveDonorModel.aggregate(aggregatePipeline)
  return {
    message: 'Active donors fetched with details',
    status: 'OK',
    data: activeDonors
  }
}

