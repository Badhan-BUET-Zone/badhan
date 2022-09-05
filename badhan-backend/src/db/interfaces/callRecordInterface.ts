import {CallRecordModel, ICallRecord} from "../models/CallRecord";
import {Schema } from 'mongoose'
export const insertOne = async (callerId: Schema.Types.ObjectId, calleeId: Schema.Types.ObjectId): Promise<{data: ICallRecord, message: string, status: string}> => {
  const callRecord: ICallRecord = new CallRecordModel({ callerId, calleeId, date: new Date().getTime() })
  const data: ICallRecord = await callRecord.save()
  return {
    message: 'Created call record successfully',
    status: 'OK',
    data
  }
}
export const findManyByCallee = async (calleeId: Schema.Types.ObjectId): Promise<{data: ICallRecord[], message: string, status: string}> => {
  const data: ICallRecord[] = await CallRecordModel.find({ calleeId }).populate({
    path: 'callerId',
    select: { _id: 1, name: 1, hall: 1, designation: 1 }
  })
  return {
    message: 'Fetched call record successfully',
    status: 'OK',
    data
  }
}

export const deleteById = async (id: string):Promise<{data?: ICallRecord, message: string, status: string}> => {
  const data: ICallRecord | null = await CallRecordModel.findByIdAndDelete(id)
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

export const findById = async (id: string):Promise<{data?: ICallRecord, message: string, status: string}> => {
  const data: ICallRecord | null = await CallRecordModel.findOne({ _id: id })
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
