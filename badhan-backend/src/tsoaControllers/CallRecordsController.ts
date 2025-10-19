import 'reflect-metadata'
import { Body, Controller, Delete, Example, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as callRecordInterface from '../db/interfaces/callRecordInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import { IDonor } from '../db/models/Donor'
import { ICallRecord } from '../db/models/CallRecord'
import callRecordValidator from '../validations/callRecords'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'

@Route('callrecords')
@Tags('Call Records')
export class CallRecordsController extends Controller {
  /** Insert a call record */
  @Post()
  @SuccessResponse(201, 'Call record insertion successful')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; callRecord: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'Call record insertion successful',
    callRecord: {
      _id: '614ec811e29ab430ddfb119a',
      callerId: '5e901d56effc590017712345',
      calleeId: '5e901d56effc590017712346',
      date: 1658974323116
    }
  })
  @Middlewares([callRecordValidator.validatePOSTCallRecords, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async postCallRecord(
    @Body() body: { donorId: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; callRecord?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor (loadTargetDonor middleware logic)
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({
      _id: body.donorId
    })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all (handleHallPermissionOrCheckAvailableToAll middleware logic)
    if (!targetDonor.availableToAll) {
      if (targetDonor.hall <= 6 &&
          user.hall !== targetDonor.hall &&
          user.designation !== 3) {
        this.setStatus(403)
        return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // Insert call record
    const callRecordInsertionResult: {data: ICallRecord, message: string, status: string} = await callRecordInterface.insertOne(user._id, targetDonor._id)

    await logInterface.addLog(user._id, 'POST CALLRECORDS', { callee: targetDonor.name })

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Call record insertion successful',
      callRecord: callRecordInsertionResult.data
    }
  }

  /** Delete a call record */
  @Delete()
  @SuccessResponse(200, 'Call record deletion successful')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Call record not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Internal server error', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Internal server error'
  })
  @Example<{ status: string; statusCode: number; message: string; deletedCallRecord: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Call record deletion successful',
    deletedCallRecord: {
      _id: '614ec811e29ab430ddfb119a',
      callerId: '5e901d56effc590017712345',
      calleeId: '5e901d56effc590017712346',
      date: 1658974323116
    }
  })
  @Middlewares([callRecordValidator.validateDELETECallRecords, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async deleteCallRecord(
    @Query() donorId: string,
    @Query() callRecordId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; deletedCallRecord?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor (loadTargetDonor middleware logic)
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({
      _id: donorId
    })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all (handleHallPermissionOrCheckAvailableToAll middleware logic)
    if (!targetDonor.availableToAll) {
      if (targetDonor.hall <= 6 &&
          user.hall !== targetDonor.hall &&
          user.designation !== 3) {
        this.setStatus(403)
        return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // Check if call record exists
    const callRecordSearchResult: {data?: ICallRecord, message: string, status: string} = await callRecordInterface.findById(callRecordId)
    if (callRecordSearchResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Call record not found' }
    }

    // Delete call record
    const callRecordDeleteResult: {data?: ICallRecord, message: string, status: string} = await callRecordInterface.deleteById(callRecordId)
    if (callRecordDeleteResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: callRecordDeleteResult.message }
    }

    await logInterface.addLog(user._id, 'DELETE CALLRECORDS', {
      callee: targetDonor.name,
      ...callRecordDeleteResult.data
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Call record deletion successful',
      deletedCallRecord: callRecordDeleteResult.data
    }
  }
}

