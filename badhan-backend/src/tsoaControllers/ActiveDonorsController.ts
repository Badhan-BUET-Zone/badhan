import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Path, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as activeDonorInterface from '../db/interfaces/activeDonorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import { IDonor } from '../db/models/Donor'
import { IActiveDonor } from '../db/models/ActiveDonor'
import activeDonorsValidator from '../validations/activeDonors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'

@Route('activeDonors')
@Tags('Active Donors')
export class ActiveDonorsController extends Controller {
  /** Add an active donor for everyone to see */
  @Post()
  @SuccessResponse(201, 'Active donor created')
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
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Active donor already created', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Active donor already created'
  })
  @Example<{ status: string; statusCode: number; message: string; newActiveDonor: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'Active donor created',
    newActiveDonor: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      markerId: '5e901d56effc590017712345',
      time: 1658974323116
    }
  })
  @Middlewares([activeDonorsValidator.validatePOSTActiveDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async postActiveDonor(
    @Body() body: { donorId: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; newActiveDonor?: any }> {
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

    // Check if active donor already exists
    const activeDonorSearch: {data?: IActiveDonor[], message: string, status: string} = await activeDonorInterface.findByDonorId(targetDonor._id)
    if (activeDonorSearch.status === 'OK') {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Active donor already created' }
    }

    // Add active donor
    const activeDonorInsertResult: {message: string, status: string, data: IActiveDonor} = await activeDonorInterface.add(targetDonor._id, user._id)

    await logInterface.addLog(user._id, 'POST ACTIVEDONORS', {
      ...activeDonorInsertResult.data,
      donor: targetDonor.name
    })

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Active donor created',
      newActiveDonor: activeDonorInsertResult.data
    }
  }

  /** Remove an active donor */
  @Delete('{donorId}')
  @SuccessResponse(200, 'Active donor deleted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Active donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; removedActiveDonor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Active donor deleted successfully',
    removedActiveDonor: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      markerId: '5e901d56effc590017712345',
      time: 1658974323116
    }
  })
  @Middlewares([activeDonorsValidator.validateDELETEActiveDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async deleteActiveDonor(
    @Path() donorId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; removedActiveDonor?: any }> {
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

    // Remove active donor
    const activeDonorRemoveResult: {data?: IActiveDonor, message: string, status: string} = await activeDonorInterface.remove(targetDonor._id)
    if (activeDonorRemoveResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Active donor not found' }
    }

    await logInterface.addLog(user._id, 'DELETE ACTIVEDONORS', {
      ...activeDonorRemoveResult.data,
      donor: targetDonor.name
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Active donor deleted successfully',
      removedActiveDonor: activeDonorRemoveResult.data
    }
  }

  /** Get list of active donors filtered by search parameters */
  @Get()
  @SuccessResponse(200, 'Active donors queried successfully')
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not allowed to search donors of other halls', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not allowed to search donors of other halls'
  })
  @Example<{ status: string; statusCode: number; message: string; activeDonors: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'Active donors queried successfully',
    activeDonors: [{
      _id: '584abcde6744144441',
      hall: 5,
      name: 'Mir Mahathir Mohammad',
      address: 'Azimpur Road',
      comment: 'Has diabetes',
      commentTime: 154782512254,
      availableToAll: true,
      bloodGroup: 2,
      studentId: '1605011',
      phone: 8801500000000,
      markedTime: 135496813489,
      markerName: 'Ifty',
      donationCount: 8,
      plateletDonationCount: 2,
      lastDonation: 1235478524412,
      lastPlateletDonation: 1235478524412,
      callRecordCount: 3,
      callCountLast3Days: 3,
      lastCallRecord: 135496813489
    }]
  })
  @Middlewares([activeDonorsValidator.validateGETActiveDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getActiveDonors(
    @Query() bloodGroup: number,
    @Query() hall: number,
    @Query() batch: string,
    @Query() name: string,
    @Query() address: string,
    @Query() isAvailable: boolean,
    @Query() isNotAvailable: boolean,
    @Query() availableToAll: boolean,
    @Query() markedByMe: boolean,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; activeDonors?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reqQuery: {
      bloodGroup: number,
      hall: number,
      batch: string,
      name: string,
      address: string,
      isAvailable: boolean,
      isNotAvailable: boolean,
      availableToAll: boolean,
      markedByMe: boolean
    } = {
      bloodGroup,
      hall,
      batch,
      name,
      address,
      isAvailable,
      isNotAvailable,
      availableToAll,
      markedByMe
    }

    // Hall permission check
    if (reqQuery.hall !== user.hall &&
        reqQuery.hall <= 6 &&
        user.designation !== 3) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not allowed to search donors of other halls' }
    }

    // Get active donors
    const activeDonors: {message: string, status: string, data: IActiveDonor[]} = await activeDonorInterface.findByQueryAndPopulate(reqQuery, user._id)
    await logInterface.addLog(user._id, 'GET ACTIVEDONORS', {
      filter: reqQuery,
      resultCount: activeDonors.data.length
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Active donors queried successfully',
      activeDonors: activeDonors.data
    }
  }
}

