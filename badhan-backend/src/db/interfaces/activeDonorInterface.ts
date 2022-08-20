import { generateAggregatePipeline } from './donorInterface'
import {ActiveDonorModel} from "../models/ActiveDonor";
import { Schema} from "mongoose";

export const add = async (donorId: Schema.Types.ObjectId, markerId: Schema.Types.ObjectId) => {
  const addedActiveDonor = new ActiveDonorModel({ donorId, markerId })
  const data = await addedActiveDonor.save()
  return {
    data,
    message: 'Active donor insertion successful',
    status: 'OK'
  }
}

export const remove = async (donorId: Schema.Types.ObjectId) => {
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

export const findByDonorId = async (donorId: Schema.Types.ObjectId) => {
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
export const findByQueryAndPopulate = async (reqQuery: {
  bloodGroup: number,
  hall: number,
  batch: string,
  name: string,
  address: string,
  isAvailable: boolean,
  isNotAvailable: boolean,
  availableToAll: boolean,
  markedByMe: boolean
}, donorId: Schema.Types.ObjectId) => {
  const aggregatePipeline = generateAggregatePipeline(reqQuery, donorId)
  // @ts-ignore
  const activeDonors = await ActiveDonorModel.aggregate(aggregatePipeline)
  return {
    message: 'Active donors fetched with details',
    status: 'OK',
    data: activeDonors
  }
}

