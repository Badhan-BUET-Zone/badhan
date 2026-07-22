import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Patch, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as plateletDonationInterface from '../db/interfaces/plateletDonationInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as tokenInterface from '../db/interfaces/tokenInterface'
import { IDonor, DonorModel } from '../db/models/Donor'
import { IDonation } from '../db/models/Donation'
import { IPlateletDonation } from '../db/models/PlateletDonation'
import donorValidator from '../validations/donors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import queue from '../middlewares/queue'
import { DESIGNATIONS_INDEX, halls, hasNoSpecificHall, isHallRestricted, isHallUnknown, year2000TimeStamp } from '../constants'

@Route('donors')
@Tags('Donors')
export class DonorsController extends Controller {
  /** Get own donor profile (alias for /users/me) */
  @Get('me')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Fetched donor details successfully',
    donor: {
      _id: '584abcde6744144441',
      name: 'Mir Mahathir Mohammad',
      phone: 8801500000000,
      hall: 5
    }
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getMe(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donor?: any }> {
    const res: ExResponse = (req as any).res
    const donor: IDonor = res.locals.middlewareResponse.donor

    await logInterface.addLog(donor._id, 'GET ME', {})

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Get donors created in a specific time range */
  @Get('new')
  @SuccessResponse(200, 'Donors created in time range fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; donors: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donors created in time range fetched successfully',
    donors: [{
      _id: 'jhdwiurh837921',
      phone: 8801521438557,
      name: 'Mir Mahathir',
      created: 1711933200000
    }]
  })
  @Middlewares([donorValidator.validateGETDonorsNew, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleHallAdminCheck])
  public async getDonorsNew(
    @Query() startTime: number,
    @Query() endTime: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donors?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const result: { data: (IDonor & { created: number })[]; message: string; status: string } = await donorInterface.findDonorsCreatedBetween(startTime, endTime)

    await logInterface.addLog(user._id, 'GET DONORS NEW', {
      startTime,
      endTime,
      resultCount: result.data.length
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Donors created in time range fetched successfully',
      donors: result.data
    }
  }

  /** Insert a new donor */
  @Post()
  @SuccessResponse(201, 'New donor inserted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Duplicate donor found', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Donor found with duplicate phone number'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Donor insertion failed', {
    status: 'ERROR',
    statusCode: 500,
    message: 'New donor insertion unsuccessful'
  })
  @Example<{ status: string; statusCode: number; message: string; newDonor: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'New donor inserted successfully',
    newDonor: {
      _id: '616ab751fc274715cc504ac7',
      phone: 8801546587552,
      name: 'Mir Mahathir',
      bloodGroup: 2,
      hall: 5,
      studentId: '1605011'
    }
  })
  @Middlewares([donorValidator.validatePOSTDonors, queue.donorInsertionQueue, authenticator.handleAuthentication])
  public async postDonor(
    @Body() body: {
      phone: number;
      studentId: string;
      bloodGroup: number;
      hall: number;
      address: string;
      roomNumber: string;
      name: string;
      comment: string;
      availableToAll: boolean;
      extraDonationCount: number;
      lastDonation?: number;
      lastPlateletDonation?: number;
      extraPlateletDonationCount?: number;
      batch?: number; // Optional parameter that tests send but isn't used
    },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; newDonor?: any; donorId?: string }> {
    const res: ExResponse = (req as any).res
    const authenticatedUser: IDonor = res.locals.middlewareResponse.donor

    const duplicateDonorResult: { data?: IDonor; message: string; status: string } = await donorInterface.findDonorByPhone(body.phone)

    if (duplicateDonorResult.status === 'OK') {
      const duplicateDonor: IDonor = duplicateDonorResult.data!
      if (
        authenticatedUser.designation === DESIGNATIONS_INDEX.SUPER_ADMIN ||
        duplicateDonor.hall === authenticatedUser.hall ||
        hasNoSpecificHall(duplicateDonor.hall) ||
        duplicateDonor.availableToAll
      ) {
        this.setStatus(409)
        return {
          status: 'ERROR',
          statusCode: 409,
          message: `Donor found with duplicate phone number in ${halls[duplicateDonor.hall]} hall`,
          donorId: duplicateDonor._id.toString()
        }
      }
      this.setStatus(409)
      return {
        status: 'ERROR',
        statusCode: 409,
        message: `Donor found with duplicate phone number in ${halls[duplicateDonor.hall]} hall. You are not permitted to access this donor.`
      }
    }

    // if the hall is unknown, then the donor must be available to all
    let availableToAll: boolean = body.availableToAll
    if (isHallUnknown(body.hall)) {
      availableToAll = true
    }

    const donorInsertionResult: { data: IDonor; message: string; status: string } = await donorInterface.insertDonor(
      body.phone,
      body.bloodGroup,
      body.hall,
      body.name,
      body.studentId,
      body.address,
      body.roomNumber,
      body.comment,
      availableToAll
    )

    if (donorInsertionResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'New donor insertion unsuccessful' }
    }

    // Blood donations: create dummy donations based on extraDonationCount
    try {
      const dummyDonations: IDonation[] = []
      for (let i: number = 0; i < body.extraDonationCount; i++) {
        dummyDonations.push({
          phone: donorInsertionResult.data.phone,
          donorId: donorInsertionResult.data._id,
          date: year2000TimeStamp
        } as IDonation)
      }
      if (dummyDonations.length > 0) {
        const dummyInsertionResult: { data: IDonation[]; message: string; status: string } = await donationInterface.insertManyDonations(dummyDonations)
        if (dummyInsertionResult.status !== 'OK') {
          this.setStatus(500)
          return { status: 'ERROR', statusCode: 500, message: 'Dummy donations insertion unsuccessful' }
        }
      }
      // Insert a real lastDonation if provided (>0)
      if (body.lastDonation && body.lastDonation > 0) {
        const lastDonationInsertResult: {data: IDonation; message: string; status: string} = await donationInterface.insertDonation(
          donorInsertionResult.data.phone,
          donorInsertionResult.data._id,
          body.lastDonation
        )
        if (lastDonationInsertResult.status !== 'OK') {
          this.setStatus(500)
          return { status: 'ERROR', statusCode: 500, message: 'Last donation insertion unsuccessful' }
        }
      }
    } catch (e) {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Donation insertion workflow failed' }
    }

    // Platelet donations
    try {
      const plateletCount: number = body.extraPlateletDonationCount || 0
      const lastPlateletDonation: number = (body.lastPlateletDonation && body.lastPlateletDonation > 0) ? body.lastPlateletDonation : 0

      for (let i: number = 0; i < plateletCount; i++) {
        const plateletDummyResult: {data: IPlateletDonation; message: string; status: string} = await plateletDonationInterface.insertPlateletDonation(
          donorInsertionResult.data.phone,
          donorInsertionResult.data._id,
          year2000TimeStamp
        )
        if (plateletDummyResult.status !== 'OK') {
          this.setStatus(500)
          return { status: 'ERROR', statusCode: 500, message: 'Dummy platelet donations insertion unsuccessful' }
        }
      }

      if (lastPlateletDonation > 0) {
        const plateletLastResult: {data: IPlateletDonation; message: string; status: string} = await plateletDonationInterface.insertPlateletDonation(
          donorInsertionResult.data.phone,
          donorInsertionResult.data._id,
          lastPlateletDonation
        )
        if (plateletLastResult.status !== 'OK') {
          this.setStatus(500)
          return { status: 'ERROR', statusCode: 500, message: 'Last platelet donation insertion unsuccessful' }
        }
      }
    } catch (e) {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Platelet donation insertion workflow failed' }
    }

    await logInterface.addLog(authenticatedUser._id, 'POST DONORS', donorInsertionResult.data)

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'New donor inserted successfully',
      newDonor: donorInsertionResult.data
    }
  }

  /** Get donor details by donorId */
  @Get()
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Fetched donor details successfully',
    donor: {
      _id: 'jhdwiurh837921',
      phone: 8801521438557,
      name: 'Mir Mahathir',
      hall: 5
    }
  })
  @Middlewares([donorValidator.validateGETDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getDonor(
    @Query() donorId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donor?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(403)
        return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // Aggregate donor info and related data
    const donorAggResult: any[] = await DonorModel.aggregate([
      { $match: { _id: targetDonor._id } },
      {
        $lookup: {
          from: 'donations',
          localField: '_id',
          foreignField: 'donorId',
          as: 'donations'
        }
      },
      {
        $lookup: {
          from: 'plateletdonations',
          localField: '_id',
          foreignField: 'donorId',
          as: 'plateletDonations'
        }
      },
      {
        $lookup: {
          from: 'callrecords',
          let: { donorId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$calleeId', '$$donorId'] } } },
            {
              $lookup: {
                from: 'donors',
                let: { callerId: '$callerId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$callerId'] } } },
                  { $project: { _id: 1, name: 1, hall: 1, designation: 1 } }
                ],
                as: 'caller'
              }
            },
            {
              $addFields: {
                callerId: { $arrayElemAt: ['$caller', 0] }
              }
            },
            { $project: { caller: 0 } }
          ],
          as: 'callRecords'
        }
      },
      {
        $lookup: {
          from: 'publiccontacts',
          localField: '_id',
          foreignField: 'donorId',
          as: 'publicContacts'
        }
      },
      {
        $lookup: {
          from: 'activedonors',
          localField: '_id',
          foreignField: 'donorId',
          as: 'activeDonorInfo'
        }
      },
      {
        $addFields: {
          lastDonation: {
            $max: {
              $map: {
                input: '$donations',
                as: 'don',
                in: '$$don.date'
              }
            }
          },
          lastPlateletDonation: {
            $max: {
              $map: {
                input: '$plateletDonations',
                as: 'pd',
                in: '$$pd.date'
              }
            }
          },
          activeDonorInfo: { $arrayElemAt: ['$activeDonorInfo', 0] }
        }
      },
      {
        $lookup: {
          from: 'donors',
          let: { markerId: '$activeDonorInfo.markerId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$markerId'] } } },
            { $project: { name: 1 } }
          ],
          as: 'markedBy'
        }
      },
      {
        $addFields: {
          markedBy: {
            $cond: [
              { $gt: [ { $size: '$markedBy' }, 0 ] },
              { $arrayElemAt: ['$markedBy', 0] },
              null
            ]
          }
        }
      },
      {
        $project: {
          password: 0,
          activeDonorInfo: 0
        }
      }
    ])

    const donor: any = donorAggResult[0]
    await logInterface.addLog(user._id, 'GET DONORS', { name: donor.name })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Update donor comment */
  @Patch('comment')
  @SuccessResponse(200, 'Comment updated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Comment updated successfully'
  })
  @Middlewares([donorValidator.validatePATCHDonorsComment, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async updateComment(
    @Body() body: { donorId: string; comment: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(403)
        return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    targetDonor.comment = body.comment
    targetDonor.commentTime = new Date().getTime()
    await targetDonor.save()

    await logInterface.addLog(user._id, 'PATCH DONORS COMMENT', targetDonor)

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Comment updated successfully'
    }
  }

  /** Request password reset for a donor */
  @Post('password')
  @SuccessResponse(200, 'Created recovery link for user successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Donor not volunteer/admin', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Donor is not a volunteer/ admin'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Created recovery link for user successfully',
    token: '5894jkrth89490'
  })
  @Middlewares([donorValidator.validatePOSTDonorsPasswordRequest, rateLimiter.passwordRequestLimiter, authenticator.handleAuthentication])
  public async requestPasswordReset(
    @Body() body: { donorId: string },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; token?: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation! < targetDonor.designation! && !user._id.equals(targetDonor._id)) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (targetDonor.designation === DESIGNATIONS_INDEX.DONOR) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Donor is not a volunteer/ admin' }
    }

    const tokenDeleteResult: { message: string; status: string } = await tokenInterface.deleteAllTokensByDonorId(targetDonor._id)
    if (tokenDeleteResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: tokenDeleteResult.message }
    }

    const tokenInsertResult: { data: any; message: string; status: string } = await tokenInterface.insertAndSaveTokenWithExpiry(targetDonor._id, res.locals.userAgent, null)
    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: tokenInsertResult.message }
    }

    await logInterface.addLog(user._id, 'POST DONORS PASSWORD (REQUEST)', { name: targetDonor.name })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Created recovery link for user successfully',
      token: tokenInsertResult.data.token
    }
  }

  /** Update donor information */
  @Patch('v2')
  @SuccessResponse(200, 'Donor updated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donor updated successfully'
  })
  @Middlewares([donorValidator.validatePATCHDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async updateDonor(
    @Body() body: {
      donorId: string;
      name: string;
      phone: number;
      studentId: string;
      bloodGroup: number;
      hall: number;
      roomNumber: string;
      address: string;
      availableToAll: boolean;
      email: string;
    },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const target: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(target.hall) && user.hall !== target.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation! < target.designation! && !user._id.equals(target._id)) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (target.email !== body.email && !target._id.equals(user._id)) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You do not have permission to edit email address of another user' }
    }

    target.name = body.name
    target.phone = body.phone
    target.studentId = body.studentId
    target.bloodGroup = body.bloodGroup
    target.hall = body.hall
    target.roomNumber = body.roomNumber
    target.address = body.address
    target.availableToAll = body.availableToAll
    target.email = body.email

    if (isHallUnknown(target.hall)) {
      target.availableToAll = true
    }

    await target.save()

    await logInterface.addLog(user._id, 'PATCH DONORS', target)

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Donor updated successfully'
    }
  }

  /** Delete a donor */
  @Delete()
  @SuccessResponse(200, 'Donor deleted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Donor must be demoted', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Donor must be demoted for deletion'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donor deleted successfully'
  })
  @Middlewares([donorValidator.validateDELETEDonors, rateLimiter.donorDeletionLimiter, authenticator.handleAuthentication])
  public async deleteDonor(
    @Query() donorId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const donor: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(donor.hall) && user.hall !== donor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation! < donor.designation! && !user._id.equals(donor._id)) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (donor.designation! > 1) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Donor must be demoted for deletion' }
    }

    const deleteDonorResult: { data?: IDonor; message: string; status: string } = await donorInterface.deleteDonorById(donor._id)
    if (deleteDonorResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: 'Error occurred in deleting target donor' }
    }

    await logInterface.addLog(user._id, 'DELETE DONORS', deleteDonorResult.data!)

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Donor deleted successfully'
    }
  }

  /** Promote or demote a donor designation */
  @Patch('designation')
  @SuccessResponse(200, 'Target user promoted/demoted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: 403,
    message: 'Only hall admins or above can access this route'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Invalid operation', {
    status: 'ERROR',
    statusCode: 409,
    message: 'Can\'t promote volunteer or can\'t demote donor'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: 200,
    message: 'Target user promoted/demoted successfully'
  })
  @Middlewares([donorValidator.validatePATCHDonorsDesignation, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async updateDesignation(
    @Body() body: { donorId: string; promoteFlag: boolean },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Donor not found' }
    }
    const donor: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(donor.hall) && user.hall !== donor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check if user is hall admin or above
    if (user.designation! < 2) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'Only hall admins or above can access this route' }
    }

    const donorDesignation: number | undefined = donor.designation

    if ((donorDesignation === 1 && body.promoteFlag) ||
      (donorDesignation === 0 && !body.promoteFlag) || donorDesignation === 3) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Can\'t promote volunteer or can\'t demote donor' }
    }

    if (hasNoSpecificHall(donor.hall)) {
      this.setStatus(409)
      return { status: 'ERROR', statusCode: 409, message: 'Donor does not have a valid hall' }
    }

    if (body.promoteFlag) {
      donor.designation = DESIGNATIONS_INDEX.VOLUNTEER
    } else {
      donor.designation = DESIGNATIONS_INDEX.DONOR
    }

    await donor.save()

    const logOperation: string = body.promoteFlag ? 'PROMOTE' : 'DEMOTE'

    await logInterface.addLog(user._id, `PATCH DONORS DESIGNATION (${logOperation})`, donor)

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Target user promoted/demoted successfully'
    }
  }

  /** Get list of designated donors of own hall */
  @Get('designation')
  @SuccessResponse(200, 'All designated members fetched')
  @Example<{ status: string; statusCode: number; message: string; volunteerList: any[]; adminList: any[]; superAdminList: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'All designated members fetched',
    volunteerList: [],
    adminList: [],
    superAdminList: []
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getDesignatedDonors(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; volunteerList?: any[]; adminList?: any[]; superAdminList?: any[] }> {
    const res: ExResponse = (req as any).res
    const authenticatedUser: IDonor = res.locals.middlewareResponse.donor

    const adminsQueryResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findAdmins(2)
    if (adminsQueryResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: adminsQueryResult.message }
    }
    const adminList: IDonor[] = adminsQueryResult.data

    const donorsQueryResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findVolunteersOfHall(authenticatedUser.hall)
    if (donorsQueryResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: donorsQueryResult.message }
    }
    const volunteerList: IDonor[] = donorsQueryResult.data

    const superAdminQuery: { data: IDonor[]; message: string; status: string } = await donorInterface.findAdmins(3)
    if (superAdminQuery.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: superAdminQuery.message }
    }
    const superAdminList: IDonor[] = superAdminQuery.data

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS DESIGNATION', {})

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'All designated members fetched',
      volunteerList,
      adminList,
      superAdminList
    }
  }

  /** Check if phone number already exists */
  @Get('checkDuplicate')
  @SuccessResponse(200, 'Duplicate check completed')
  @Example<{ status: string; statusCode: number; message: string; found: boolean; donor: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'No duplicate donors found',
    found: false,
    donor: null
  })
  @Middlewares([donorValidator.validateGETDonorsDuplicate, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async checkDuplicate(
    @Query() phone: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; found?: boolean; donor?: any }> {
    const res: ExResponse = (req as any).res
    const authenticatedUser: IDonor = res.locals.middlewareResponse.donor

    const duplicateDonorResult: { data?: IDonor; message: string; status: string } = await donorInterface.findDonorByPhone(phone)

    if (duplicateDonorResult.status === 'OK') {
      if (
        authenticatedUser.designation === DESIGNATIONS_INDEX.SUPER_ADMIN ||
        duplicateDonorResult.data!.hall === authenticatedUser.hall ||
        hasNoSpecificHall(duplicateDonorResult.data!.hall) ||
        duplicateDonorResult.data!.availableToAll
      ) {
        this.setStatus(200)
        return {
          status: 'OK',
          statusCode: 200,
          message: `Donor found with duplicate phone number in ${halls[duplicateDonorResult.data!.hall]} hall`,
          found: true,
          donor: duplicateDonorResult.data
        }
      }

      this.setStatus(200)
      return {
        status: 'OK',
        statusCode: 200,
        message: `Donor found with duplicate phone number in ${halls[duplicateDonorResult.data!.hall]} hall. You are not permitted to access this donor.`,
        found: true,
        donor: null
      }
    }

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS CHECKDUPLICATE', { phone })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'No duplicate donors found',
      found: false,
      donor: null
    }
  }

  /** Check whether list of phone numbers exist in database */
  @Get('phone')
  @SuccessResponse(200, 'Existing donors fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; donors: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'Existing donors fetched successfully',
    donors: []
  })
  @Middlewares([donorValidator.validateGETDonorsDuplicateMany, authenticator.handleAuthentication])
  public async checkPhoneList(
    @Query() phoneList: number[],
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donors?: any[] }> {
    const res: ExResponse = (req as any).res
    const authenticatedUser: IDonor = res.locals.middlewareResponse.donor

    const existingDonorsResult: { donors: IDonor[]; message: string; status: string } = await donorInterface.findDonorIdsByPhone(
      authenticatedUser.designation!,
      authenticatedUser.hall,
      phoneList
    )

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS PHONE', { phones: phoneList })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: existingDonorsResult.message,
      donors: existingDonorsResult.donors
    }
  }

  /** Get all designated donors (Super Admin only) */
  @Get('designation/all')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; data: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'Fetched donor details successfully',
    data: [{
      _id: '584abcde6744144441',
      name: 'Mir Mahathir Mohammad',
      phone: 8801500000000,
      hall: 5,
      studentId: '1605011',
      logCount: 100,
      designation: 3
    }]
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getAllDesignatedDonors(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; data?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const allDesignatedDonorResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findAllDesignatedDonors()

    if (allDesignatedDonorResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: allDesignatedDonorResult.message }
    }

    await logInterface.addLog(user._id, 'GET DONORS DESIGNATION ALL', {})

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Fetched donor details successfully',
      data: allDesignatedDonorResult.data
    }
  }
}

