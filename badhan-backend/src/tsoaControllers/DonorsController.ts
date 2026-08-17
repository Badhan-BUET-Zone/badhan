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
import { DESIGNATIONS_INDEX, HTTP_STATUS, halls, hasNoSpecificHall, isHallRestricted, isHallUnknown, year2000TimeStamp } from '../constants'

@Route('donors')
@Tags('Donors')
export class DonorsController extends Controller {
  /** Get own donor profile (alias for /users/me) */
  @Get('me')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Get donors created in a specific time range */
  @Get('new')
  @SuccessResponse(200, 'Donors created in time range fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; donors: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donors created in time range fetched successfully',
      donors: result.data
    }
  }

  /** Insert a new donor */
  @Post()
  @SuccessResponse(201, 'New donor inserted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Duplicate donor found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Donor found with duplicate phone number'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Donor insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'New donor insertion unsuccessful'
  })
  @Example<{ status: string; statusCode: number; message: string; newDonor: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
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
      fatherName: string;
      motherName: string;
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
        this.setStatus(HTTP_STATUS.CONFLICT)
        return {
          status: 'ERROR',
          statusCode: HTTP_STATUS.CONFLICT,
          message: `Donor found with duplicate phone number in ${halls[duplicateDonor.hall]} hall`,
          donorId: duplicateDonor._id.toString()
        }
      }
      this.setStatus(HTTP_STATUS.CONFLICT)
      return {
        status: 'ERROR',
        statusCode: HTTP_STATUS.CONFLICT,
        message: `Donor found with duplicate phone number in ${halls[duplicateDonor.hall]} hall. You are not permitted to access this donor.`
      }
    }

    // No "(Unknown) forces availableToAll" branch here: validatePOSTDonors rejects (Unknown) on a
    // creation, so body.hall is always a real hall. The PATCH counterpart keeps that branch — that
    // route still accepts (Unknown), for the records created before it was forbidden.
    const donorInsertionResult: { data: IDonor; message: string; status: string } = await donorInterface.insertDonor(
      body.phone,
      body.bloodGroup,
      body.hall,
      body.name,
      body.studentId,
      body.address,
      body.roomNumber,
      body.comment,
      body.availableToAll,
      body.fatherName,
      body.motherName
    )

    if (donorInsertionResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'New donor insertion unsuccessful' }
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
          this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Dummy donations insertion unsuccessful' }
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
          this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Last donation insertion unsuccessful' }
        }
      }
    } catch (e) {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Donation insertion workflow failed' }
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
          this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Dummy platelet donations insertion unsuccessful' }
        }
      }

      if (lastPlateletDonation > 0) {
        const plateletLastResult: {data: IPlateletDonation; message: string; status: string} = await plateletDonationInterface.insertPlateletDonation(
          donorInsertionResult.data.phone,
          donorInsertionResult.data._id,
          lastPlateletDonation
        )
        if (plateletLastResult.status !== 'OK') {
          this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Last platelet donation insertion unsuccessful' }
        }
      }
    } catch (e) {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Platelet donation insertion workflow failed' }
    }

    await logInterface.addLog(authenticatedUser._id, 'POST DONORS', donorInsertionResult.data)

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'New donor inserted successfully',
      newDonor: donorInsertionResult.data
    }
  }

  /** Get donor details by donorId */
  @Get()
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; donor: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Fetched donor details successfully',
    donor: {
      _id: 'jhdwiurh837921',
      phone: 8801521438557,
      name: 'Mir Mahathir',
      hall: 5
    }
  })
  // No commonLimiter: the archive sweep fetches each donor before patching it (the search response
  // projects email away, and PATCH /donors/v2 takes a full body), so this route is driven in a loop
  // too. See the note on PATCH /donors/v2 below.
  @Middlewares([donorValidator.validateGETDonors, authenticator.handleAuthentication])
  public async getDonor(
    @Query() donorId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donor?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(HTTP_STATUS.FORBIDDEN)
        return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
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

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      donor
    }
  }

  /** Update donor comment */
  @Patch('comment')
  @SuccessResponse(200, 'Comment updated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Donor has no valid hall', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Donor does not have a valid hall'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(HTTP_STATUS.FORBIDDEN)
        return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // A record with no recorded hall is one waiting to be completed, not one to annotate. Same
    // message as the designation route below, which has always refused for the same reason.
    // isHallUnknown rather than hasNoSpecificHall: a donor record cannot hold Attached, so the two
    // agree today, and naming the value keeps the rule readable when they stop agreeing.
    if (isHallUnknown(targetDonor.hall)) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Donor does not have a valid hall' }
    }

    targetDonor.comment = body.comment
    targetDonor.commentTime = new Date().getTime()
    await targetDonor.save()

    await logInterface.addLog(user._id, 'PATCH DONORS COMMENT', targetDonor)

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Comment updated successfully'
    }
  }

  /** Request password reset for a donor */
  @Post('password')
  @SuccessResponse(200, 'Created recovery link for user successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Donor not volunteer/admin', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Donor is not a volunteer/ admin'
  })
  @Example<{ status: string; statusCode: number; message: string; token: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(targetDonor.hall) && user.hall !== targetDonor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation < targetDonor.designation && !user._id.equals(targetDonor._id)) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (targetDonor.designation === DESIGNATIONS_INDEX.DONOR) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Donor is not a volunteer/ admin' }
    }

    const tokenDeleteResult: { message: string; status: string } = await tokenInterface.deleteAllTokensByDonorId(targetDonor._id)
    if (tokenDeleteResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: tokenDeleteResult.message }
    }

    const tokenInsertResult: { data: any; message: string; status: string } = await tokenInterface.insertAndSaveTokenWithExpiry(targetDonor._id, res.locals.userAgent, null)
    if (tokenInsertResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: tokenInsertResult.message }
    }

    await logInterface.addLog(user._id, 'POST DONORS PASSWORD (REQUEST)', { name: targetDonor.name })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Created recovery link for user successfully',
      token: tokenInsertResult.data.token
    }
  }

  /** Update donor information */
  @Patch('v2')
  @SuccessResponse(200, 'Donor updated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Donor updated successfully'
  })
  // No commonLimiter: the search-results archive sweep drives this route in a client-side loop, one
  // call per donor, and a 12-per-minute ceiling would 429 it on the sixth donor. handleAuthentication
  // stays, so the full permission predicate below is unchanged; what goes away is only the per-IP
  // request ceiling. Precedent in this controller: POST /donors (queue instead of a limiter) and
  // GET /donors/checkDuplicateMany (no limiter), both for the same reason.
  @Middlewares([donorValidator.validatePATCHDonors, authenticator.handleAuthentication])
  public async updateDonor(
    @Body() body: {
      donorId: string;
      name: string;
      fatherName: string;
      motherName: string;
      phone: number;
      studentId: string;
      bloodGroup: number;
      hall: number;
      roomNumber: string;
      address: string;
      availableToAll: boolean;
      archiveFlag: boolean;
      isCertificateEnabled: boolean;
      email: string;
    },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const target: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(target.hall) && user.hall !== target.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation < target.designation && !user._id.equals(target._id)) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (target.email !== body.email && !target._id.equals(user._id)) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You do not have permission to edit email address of another user' }
    }

    target.name = body.name
    target.fatherName = body.fatherName
    target.motherName = body.motherName
    target.phone = body.phone
    target.studentId = body.studentId
    target.bloodGroup = body.bloodGroup
    target.hall = body.hall
    target.roomNumber = body.roomNumber
    target.address = body.address
    target.availableToAll = body.availableToAll
    target.isCertificateEnabled = body.isCertificateEnabled
    target.email = body.email

    // Archiving is a donor edit, so it inherits the permission predicate already enforced above and
    // needs no gate of its own. This block is the whole archiving implementation: the detail-page
    // switch hits it once, the search-results footer hits it once per donor.
    // Archiving demotes — a volunteer or hall admin becomes a plain donor — but a super admin keeps
    // designation 3. Unarchiving never restores a designation: demotion is one-way and re-promotion
    // is done by hand, so no previous designation is stored.
    const isNewlyArchived: boolean = body.archiveFlag && !target.archiveFlag
    target.archiveFlag = body.archiveFlag
    if (isNewlyArchived && target.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      target.designation = DESIGNATIONS_INDEX.DONOR
    }

    if (isHallUnknown(target.hall)) {
      target.availableToAll = true
    }

    await target.save()

    await logInterface.addLog(user._id, 'PATCH DONORS', target)

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donor updated successfully'
    }
  }

  /** Delete a donor */
  @Delete()
  @SuccessResponse(200, 'Donor deleted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Donor must be demoted', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Donor must be demoted for deletion'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const donor: IDonor = donorQueryResult.data!

    // Handle hall permission
    if (isHallRestricted(donor.hall) && user.hall !== donor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check higher designation
    if (user.designation < donor.designation && !user._id.equals(donor._id)) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You cannot modify the details of a Badhan member with higher designation' }
    }

    if (donor.designation > DESIGNATIONS_INDEX.VOLUNTEER) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Donor must be demoted for deletion' }
    }

    const deleteDonorResult: { data?: IDonor; message: string; status: string } = await donorInterface.deleteDonorById(donor._id)
    if (deleteDonorResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Error occurred in deleting target donor' }
    }

    await logInterface.addLog(user._id, 'DELETE DONORS', deleteDonorResult.data!)

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donor deleted successfully'
    }
  }

  /**
   * Change a donor's designation to an explicit target level.
   * Hall admins may toggle donors between donor (0) and volunteer (1) within their own
   * hall; super admins may additionally promote a volunteer to hall admin (2) or super
   * admin (3) and demote a super admin back to volunteer. Only a volunteer can be
   * promoted to hall admin or super admin, so those roles must always be reached through
   * volunteer first, and a hall admin is never demoted directly — it happens only as the
   * side effect of promoting another donor to hall admin in the same hall.
   */
  @Patch('designation')
  @SuccessResponse(200, 'Target user promoted/demoted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'Only hall admins or above can access this route'
  })
  @Response<{ status: string; statusCode: number; message: string }>(409, 'Invalid operation', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Invalid designation transition'
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Target user promoted/demoted successfully'
  })
  @Middlewares([donorValidator.validatePATCHDonorsDesignation, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async updateDesignation(
    @Body() body: { donorId: string; designation: number },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // Load target donor
    const donorQueryResult: {data?: IDonor, message: string, status: string} = await donorInterface.findDonorByQuery({ _id: body.donorId })
    if (donorQueryResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const donor: IDonor = donorQueryResult.data!

    // Handle hall permission — hall admins are confined to their own hall; super admins are not
    if (isHallRestricted(donor.hall) && user.hall !== donor.hall && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
    }

    // Check if user is hall admin or above
    if (user.designation < DESIGNATIONS_INDEX.HALL_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'Only hall admins or above can access this route' }
    }

    const from: number = donor.designation
    const to: number = body.designation
    const isSuperAdmin: boolean = user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN

    // Only a super admin may set or clear the hall-admin / super-admin roles
    const touchesElevatedRole: boolean =
      from === DESIGNATIONS_INDEX.HALL_ADMIN || from === DESIGNATIONS_INDEX.SUPER_ADMIN ||
      to === DESIGNATIONS_INDEX.HALL_ADMIN || to === DESIGNATIONS_INDEX.SUPER_ADMIN
    if (touchesElevatedRole && !isSuperAdmin) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'Only super admins can change hall admin or super admin designations' }
    }

    // Hall admin and super admin can only be reached from volunteer
    if (to === DESIGNATIONS_INDEX.SUPER_ADMIN && from !== DESIGNATIONS_INDEX.VOLUNTEER) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Only a volunteer can be promoted to super admin' }
    }
    if (to === DESIGNATIONS_INDEX.HALL_ADMIN && from !== DESIGNATIONS_INDEX.VOLUNTEER) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Only a volunteer can be promoted to hall admin' }
    }

    // Transition whitelist (§2). Everything not listed is a no-op or illegal jump → 409.
    const isValidTransition: boolean =
      (from === DESIGNATIONS_INDEX.DONOR && to === DESIGNATIONS_INDEX.VOLUNTEER) ||
      (from === DESIGNATIONS_INDEX.VOLUNTEER && to === DESIGNATIONS_INDEX.DONOR) ||
      (from === DESIGNATIONS_INDEX.VOLUNTEER && to === DESIGNATIONS_INDEX.HALL_ADMIN) ||
      (from === DESIGNATIONS_INDEX.VOLUNTEER && to === DESIGNATIONS_INDEX.SUPER_ADMIN) ||
      (from === DESIGNATIONS_INDEX.SUPER_ADMIN && to === DESIGNATIONS_INDEX.VOLUNTEER)
    if (!isValidTransition) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Invalid designation transition' }
    }

    // Valid-hall requirement for the 0 ↔ 1 and → 2 paths; the → 3 / super-admin role is
    // system-wide and carries no hall check (as the old super-admin route had none).
    const requiresValidHall: boolean = to !== DESIGNATIONS_INDEX.SUPER_ADMIN && from !== DESIGNATIONS_INDEX.SUPER_ADMIN
    if (requiresValidHall && hasNoSpecificHall(donor.hall)) {
      this.setStatus(HTTP_STATUS.CONFLICT)
      return { status: 'ERROR', statusCode: HTTP_STATUS.CONFLICT, message: 'Donor does not have a valid hall' }
    }

    // One hall admin per hall: promoting to hall admin demotes the current incumbent
    if (to === DESIGNATIONS_INDEX.HALL_ADMIN) {
      await donorInterface.findDonorAndUpdate(
        { hall: donor.hall, designation: DESIGNATIONS_INDEX.HALL_ADMIN },
        { $set: { designation: DESIGNATIONS_INDEX.VOLUNTEER } }
      )
    }

    donor.designation = to
    await donor.save()

    await logInterface.addLog(user._id, `PATCH DONORS DESIGNATION (${from} → ${to})`, donor)

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Target user promoted/demoted successfully'
    }
  }

  /** Get list of designated donors of own hall */
  @Get('designation')
  @SuccessResponse(200, 'All designated members fetched')
  @Example<{ status: string; statusCode: number; message: string; volunteerList: any[]; adminList: any[]; superAdminList: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: adminsQueryResult.message }
    }
    const adminList: IDonor[] = adminsQueryResult.data

    const donorsQueryResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findVolunteersOfHall(authenticatedUser.hall)
    if (donorsQueryResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: donorsQueryResult.message }
    }
    const volunteerList: IDonor[] = donorsQueryResult.data

    const superAdminQuery: { data: IDonor[]; message: string; status: string } = await donorInterface.findAdmins(3)
    if (superAdminQuery.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: superAdminQuery.message }
    }
    const superAdminList: IDonor[] = superAdminQuery.data

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS DESIGNATION', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
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
    statusCode: HTTP_STATUS.OK,
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
        this.setStatus(HTTP_STATUS.OK)
        return {
          status: 'OK',
          statusCode: HTTP_STATUS.OK,
          message: `Donor found with duplicate phone number in ${halls[duplicateDonorResult.data!.hall]} hall`,
          found: true,
          donor: duplicateDonorResult.data
        }
      }

      this.setStatus(HTTP_STATUS.OK)
      return {
        status: 'OK',
        statusCode: HTTP_STATUS.OK,
        message: `Donor found with duplicate phone number in ${halls[duplicateDonorResult.data!.hall]} hall. You are not permitted to access this donor.`,
        found: true,
        donor: null
      }
    }

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS CHECKDUPLICATE', { phone })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
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
    statusCode: HTTP_STATUS.OK,
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
      authenticatedUser.designation,
      authenticatedUser.hall,
      phoneList
    )

    await logInterface.addLog(authenticatedUser._id, 'GET DONORS PHONE', { phones: phoneList })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: existingDonorsResult.message,
      donors: existingDonorsResult.donors
    }
  }

  /** Get every donor, designated or not (Super Admin only) */
  @Get('all')
  @SuccessResponse(200, 'Fetched donor details successfully')
  @Example<{ status: string; statusCode: number; message: string; data: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
  @Middlewares([donorValidator.validateGETDonorsAll, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getAllDonors(
    @Query() archiveFlag: boolean,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; data?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const allDonorResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findAllDonors(archiveFlag)

    if (allDonorResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: allDonorResult.message }
    }

    await logInterface.addLog(user._id, 'GET DONORS ALL', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Fetched donor details successfully',
      data: allDonorResult.data
    }
  }

  /** Get every donor whose certificate is enabled */
  @Get('certificateEnabled')
  @SuccessResponse(200, 'Certificate enabled donors fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; data: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Certificate enabled donors fetched successfully',
    data: [{
      _id: '584abcde6744144441',
      name: 'Mir Mahathir Mohammad',
      hall: 5,
      studentId: '1605011',
      bloodGroup: 2,
      designation: 3,
      archiveFlag: false,
      isCertificateEnabled: true
    }]
  })
  // Super admin rather than hall admin, even though a hall admin may SET this flag on a donor of
  // their own hall: the page's whole value is seeing across halls at once, which a hall-scoped
  // check would defeat. A hall admin who wants to know about one donor already has the profile.
  //
  // No validator in the array because the route takes no path, query or body parameter — a
  // consequence of listing archived donors alongside live ones instead of taking an archiveFlag.
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getCertificateEnabledDonors(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; data?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const result: { data: IDonor[]; message: string; status: string } = await donorInterface.findCertificateEnabledDonors()

    if (result.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: result.message }
    }

    // The count, not the list: it makes growth in the enabled set visible in the logs without
    // storing a copy of who was on it.
    await logInterface.addLog(user._id, 'GET DONORS CERTIFICATE ENABLED', {
      resultCount: result.data.length
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Certificate enabled donors fetched successfully',
      data: result.data
    }
  }
}

