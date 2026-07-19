import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as plateletDonationInterface from '../db/interfaces/plateletDonationInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import { IPlateletDonation } from '../db/models/PlateletDonation'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import plateletDonationValidator from '../validations/plateletDonations'
import { loadTargetDonor } from '../middlewares/donor'

@Route('platelet-donations')
@Tags('PlateletDonations')
export class PlateletDonationsController extends Controller {
  /** Insert a platelet donation */
  @Post()
  @SuccessResponse(201, 'Platelet donation inserted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Internal server error', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Internal server error'
  })
  @Example<{ status: string; statusCode: number; message: string; newPlateletDonation: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'Platelet donation inserted successfully',
    newPlateletDonation: {
      date: 1611100800000,
      _id: '614ec811e29ab430ddfb119a',
      phone: 8801500000000,
      donorId: '5e901d56effc590017712345'
    }
  })
  @Middlewares([plateletDonationValidator.validatePOSTPlateletDonations, authenticator.handleAuthentication, loadTargetDonor, authenticator.handleHallPermissionOrCheckAvailableToAll])
  public async postPlateletDonation(
    @Body() body: { donorId: string; date: number },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; newPlateletDonation?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    const targetDonor: IDonor = res.locals.middlewareResponse.targetDonor

    const plateletDonationInsertionResult: { data: IPlateletDonation; message: string; status: string } = await plateletDonationInterface.insertPlateletDonation(
      targetDonor.phone,
      targetDonor._id,
      body.date
    )

    if (plateletDonationInsertionResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: plateletDonationInsertionResult.message }
    }

    await logInterface.addLog(user._id, 'POST PLATELET DONATIONS', {
      ...plateletDonationInsertionResult.data,
      donor: targetDonor.name
    })

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Platelet donation inserted successfully',
      newPlateletDonation: plateletDonationInsertionResult.data
    }
  }

  /** Delete a platelet donation */
  @Delete()
  @SuccessResponse(200, 'Deleted platelet donation successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Platelet donation not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Matching platelet donation not found'
  })
  @Example<{ status: string; statusCode: number; message: string; deletedPlateletDonation: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Deleted platelet donation successfully',
    deletedPlateletDonation: {
      date: 1611100800000,
      _id: '614ec811e29ab430ddfb119a',
      phone: 8801500000000,
      donorId: '5e901d56effc590017712345'
    }
  })
  @Middlewares([plateletDonationValidator.validateDELETEPlateletDonations, rateLimiter.deleteDonationLimiter, authenticator.handleAuthentication, loadTargetDonor, authenticator.handleHallPermissionOrCheckAvailableToAll])
  public async deletePlateletDonation(
    @Query() donorId: string,
    @Query() date: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; deletedPlateletDonation?: any }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    const targetDonor: IDonor = res.locals.middlewareResponse.targetDonor

    const plateletDonationDeletionResult: { data?: IPlateletDonation; message: string; status: string } = await plateletDonationInterface.deletePlateletDonationByQuery({
      donorId: targetDonor._id,
      date
    })

    if (plateletDonationDeletionResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Matching platelet donation not found' }
    }

    await plateletDonationInterface.findLatestPlateletDonationByDonorId(targetDonor._id)

    await logInterface.addLog(user._id, 'DELETE PLATELET DONATIONS', {
      ...plateletDonationDeletionResult.data,
      name: targetDonor.name
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Deleted platelet donation successfully',
      deletedPlateletDonation: plateletDonationDeletionResult.data
    }
  }

  /** Get platelet donations report (Super Admin only) */
  @Get('report')
  @SuccessResponse(200, 'Platelet donations report generated successfully')
  @Example<{ status: string; statusCode: number; message: string; report: any[]; firstPlateletDonationCount: number }>({
    status: 'OK',
    statusCode: 200,
    message: 'Platelet donations report generated successfully',
    report: [{
      counts: [{
        month: 1,
        year: 2024,
        count: 15
      }],
      bloodGroup: 2
    }],
    firstPlateletDonationCount: 75
  })
  @Middlewares([plateletDonationValidator.validateGETPlateletDonationsReport, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getPlateletDonationsReport(
    @Query() startDate: number,
    @Query() endDate: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; report?: any[]; firstPlateletDonationCount?: number }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reportResult: { data: plateletDonationInterface.IPlateletDonationCountByBloodGroup[]; message: string; status: string } = await plateletDonationInterface.getPlateletDonationCountByTimePeriod(startDate, endDate)
    const countOfFirstTimePlateletDonationsOfDonors: { data: number; message: string; status: string } = await donorInterface.getCountOfDonorsWhoDonatedPlateletForTheFirstTime(startDate, endDate)

    await logInterface.addLog(user._id, 'GET PLATELET DONATIONS REPORT', {
      ...reportResult.data,
      name: user.name
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: reportResult.message,
      report: reportResult.data,
      firstPlateletDonationCount: countOfFirstTimePlateletDonationsOfDonors.data
    }
  }
}

