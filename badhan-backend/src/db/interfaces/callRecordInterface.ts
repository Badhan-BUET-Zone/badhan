import {CallRecordModel} from "../models/CallRecord";
import {Schema } from 'mongoose'
export const insertOne = async (callerId: Schema.Types.ObjectId, calleeId: Schema.Types.ObjectId) => {
  const callRecord = new CallRecordModel(
    { callerId, calleeId, date: new Date().getTime() })
  const data = await callRecord.save()
  return {
    message: 'Created call record successfully',
    status: 'OK',
    data
  }
}
export const findManyByCallee = async (calleeId: Schema.Types.ObjectId) => {
  const data = await CallRecordModel.find({ calleeId }).populate({
    path: 'callerId',
    select: { _id: 1, name: 1, hall: 1, designation: 1 }
  })
  return {
    message: 'Fetched call record successfully',
    status: 'OK',
    data
  }
}

export const deleteById = async (id: string) => {
  const data = await CallRecordModel.findByIdAndDelete(id)
  if (data) {
    return {
      message: 'Call record deleted successfully',
      status: 'OK',
      data
    }
  }
  return {
    message: 'Call record not found',
    status: 'ERROR'
  }
}

export const findById = async (id: string) => {
  const data = await CallRecordModel.findOne({ _id: id })
  if (!data) {
    return {
      message: 'No call record found',
      status: 'ERROR'
    }
  }
  return {
    message: 'Call record fetched successfully',
    status: 'OK',
    data
  }
}
