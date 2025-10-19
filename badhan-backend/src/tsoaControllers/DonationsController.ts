import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import { IDonation } from '../db/models/Donation'
import donationValidator from '../validations/donations'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'

@Route('donations')
@Tags('Donations')
export class DonationsController extends Controller {
  /** Insert a donation date for a donor */
  @Post()
  @SuccessResponse(201, 'Donation inserted successfully')
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
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Donation insertion failed', {
    status: 'ERROR',
    statusCode: 500,
    message: 'Donation insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; newDonation: any }>({
    status: 'OK',
    statusCode: 201,
    message: 'Donation inserted successfully',
    newDonation: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      phone: 8801500000000,
      date: 1611100800000
    }
  })
  @Middlewares([donationValidator.validatePOSTDonations, rateLimiter.donationInsertionLimiter, authenticator.handleAuthentication])
  public async postDonation(
    @Body() body: { donorId: string; date: number; phone?: number },
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; newDonation?: any }> {
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

    // Insert donation
    const donationInsertionResult: {data: IDonation, message: string, status: string} = await donationInterface.insertDonation(
      targetDonor.phone,
      targetDonor._id,
      body.date
    )

    if (donationInsertionResult.status !== 'OK') {
      this.setStatus(500)
      return { status: 'ERROR', statusCode: 500, message: donationInsertionResult.message }
    }

    await logInterface.addLog(user._id, 'POST DONATIONS', {
      ...donationInsertionResult.data,
      donor: targetDonor.name
    })

    this.setStatus(201)
    return {
      status: 'OK',
      statusCode: 201,
      message: 'Donation inserted successfully',
      newDonation: donationInsertionResult.data
    }
  }

  /** Delete a donation for a donor */
  @Delete()
  @SuccessResponse(200, 'Deleted donation successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Matching donation not found', {
    status: 'ERROR',
    statusCode: 404,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; deletedDonation: any }>({
    status: 'OK',
    statusCode: 200,
    message: 'Deleted donation successfully',
    deletedDonation: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      phone: 8801500000000,
      date: 1611100800000
    }
  })
  @Middlewares([donationValidator.validateDELETEDonations, rateLimiter.deleteDonationLimiter, authenticator.handleAuthentication])
  public async deleteDonation(
    @Query() donorId: string,
    @Query() date: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; deletedDonation?: any }> {
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

    // Delete donation
    const donationDeletionResult: {data?: IDonation, message: string, status: string} = await donationInterface.deleteDonationByQuery({
      donorId: targetDonor._id,
      date
    })

    if (donationDeletionResult.status !== 'OK') {
      this.setStatus(404)
      return { status: 'ERROR', statusCode: 404, message: 'Matching donation not found' }
    }

    await donationInterface.findLatestDonationByDonorId(targetDonor._id)

    await logInterface.addLog(user._id, 'DELETE DONATIONS', {
      ...donationDeletionResult.data,
      name: targetDonor.name
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Deleted donation successfully',
      deletedDonation: donationDeletionResult.data
    }
  }

  /** Generate a comprehensive report of all blood donations (Super Admin only) */
  @Get('report')
  @SuccessResponse(200, 'Donations report generated successfully')
  @Example<{ status: string; statusCode: number; message: string; report: any[]; firstDonationCount: number }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donations report generated successfully',
    report: [{
      bloodGroup: 2,
      counts: [{
        month: 1,
        year: 2024,
        count: 25
      }]
    }],
    firstDonationCount: 150
  })
  @Middlewares([donationValidator.validateGETDonationsReport, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getDonationsReport(
    @Query() startDate: number,
    @Query() endDate: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; report?: any[]; firstDonationCount?: number }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reportResult: {data: donationInterface.IDonationCountByBloodGroup[], message: string, status: string} = await donationInterface.getDonationCountByTimePeriod(startDate, endDate)
    const countOfFirstTimeDonationsOfDonors: {data: number, message: string, status: string} = await donorInterface.getCountOfDonorsWhoDonatedForTheFirstTime(startDate, endDate)

    await logInterface.addLog(user._id, 'GET DONATIONS REPORT', {
      ...reportResult.data,
      name: user.name
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: reportResult.message,
      report: reportResult.data,
      firstDonationCount: countOfFirstTimeDonationsOfDonors.data
    }
  }
}

