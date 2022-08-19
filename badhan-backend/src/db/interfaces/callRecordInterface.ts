// @ts-nocheck
/* tslint:disable */
import CallRecord from "../models/CallRecord";
const insertOne = async (callerId, calleeId) => {
  const callRecord = new CallRecord(
    { callerId, calleeId, date: new Date().getTime() })
  const data = await callRecord.save()
  return {
    message: 'Created call record successfully',
    status: 'OK',
    data: data
  }
}
const findManyByCallee = async (calleeId) => {
  const data = await CallRecord.find({ calleeId }).populate({
    path: 'callerId',
    select: { _id: 1, name: 1, hall: 1, designation: 1 }
  })
  return {
    message: 'Fetched call record successfully',
    status: 'OK',
    data: data
  }
}

const deleteById = async (id) => {
  const data = await CallRecord.findByIdAndDelete(id)
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

const findById = async (id) => {
  const data = await CallRecord.findOne({ _id: id })
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
module.exports = {
  insertOne,
  findManyByCallee,
  deleteById,
  findById
}
