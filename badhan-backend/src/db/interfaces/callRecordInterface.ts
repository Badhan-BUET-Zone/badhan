// @ts-nocheck
/* tslint:disable */
import {CallRecordModel} from "../models/CallRecord";
export const insertOne = async (callerId, calleeId) => {
  const callRecord = new CallRecordModel(
    { callerId, calleeId, date: new Date().getTime() })
  const data = await callRecord.save()
  return {
    message: 'Created call record successfully',
    status: 'OK',
    data: data
  }
}
export const findManyByCallee = async (calleeId) => {
  const data = await CallRecordModel.find({ calleeId }).populate({
    path: 'callerId',
    select: { _id: 1, name: 1, hall: 1, designation: 1 }
  })
  return {
    message: 'Fetched call record successfully',
    status: 'OK',
    data: data
  }
}

export const deleteById = async (id) => {
  const data = await CallRecordModel.findByIdAndDelete(id)
  if (data) {
    return {
      message: 'Call record deleted successfully',
      status: 'OK',
      data: data
    }
  }
  return {
    message: 'Call record not found',
    status: 'ERROR'
  }
}

export const findById = async (id) => {
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
    data: data
  }
}
export default {
  insertOne,
  findManyByCallee,
  deleteById,
  findById
}
