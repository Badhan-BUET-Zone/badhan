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
import { DESIGNATIONS_INDEX, HTTP_STATUS, isHallRestricted } from '../constants'

@Route('donations')
@Tags('Donations')
export class DonationsController extends Controller {
  /** Insert a donation date for a donor */
  @Post()
  @SuccessResponse(201, 'Donation inserted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Donation insertion failed', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Donation insertion failed'
  })
  @Example<{ status: string; statusCode: number; message: string; newDonation: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: 'Donation inserted successfully',
    newDonation: {
      _id: '614ec811e29ab430ddfb119a',
      donorId: '5e901d56effc590017712345',
      phone: 8801500000000,
      date: 1611100800000
    }
  })
  @Middlewares([donationValidator.validatePOSTDonations, authenticator.handleAuthentication])
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all (handleHallPermissionOrCheckAvailableToAll middleware logic)
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) &&
          user.hall !== targetDonor.hall &&
          user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(HTTP_STATUS.FORBIDDEN)
        return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // Insert donation
    const donationInsertionResult: {data: IDonation, message: string, status: string} = await donationInterface.insertDonation(
      targetDonor.phone,
      targetDonor._id,
      body.date
    )

    if (donationInsertionResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: donationInsertionResult.message }
    }

    await logInterface.addLog(user._id, 'POST DONATIONS', {
      ...donationInsertionResult.data,
      donor: targetDonor.name
    })

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Donation inserted successfully',
      newDonation: donationInsertionResult.data
    }
  }

  /** Delete a donation for a donor */
  @Delete()
  @SuccessResponse(200, 'Deleted donation successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Donor not found / Matching donation not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Donor not found'
  })
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not authorized to access donor', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not authorized to access a donor of different hall'
  })
  @Example<{ status: string; statusCode: number; message: string; deletedDonation: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Donor not found' }
    }
    const targetDonor: IDonor = donorQueryResult.data!

    // Handle hall permission or check available to all (handleHallPermissionOrCheckAvailableToAll middleware logic)
    if (!targetDonor.availableToAll) {
      if (isHallRestricted(targetDonor.hall) &&
          user.hall !== targetDonor.hall &&
          user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
        this.setStatus(HTTP_STATUS.FORBIDDEN)
        return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not authorized to access a donor of different hall' }
      }
    }

    // Delete donation
    const donationDeletionResult: {data?: IDonation, message: string, status: string} = await donationInterface.deleteDonationByQuery({
      donorId: targetDonor._id,
      date
    })

    if (donationDeletionResult.status !== 'OK') {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Matching donation not found' }
    }

    await donationInterface.findLatestDonationByDonorId(targetDonor._id)

    await logInterface.addLog(user._id, 'DELETE DONATIONS', {
      ...donationDeletionResult.data,
      name: targetDonor.name
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Deleted donation successfully',
      deletedDonation: donationDeletionResult.data
    }
  }

  /** Generate a comprehensive report of all blood donations (Super Admin only) */
  @Get('report')
  @SuccessResponse(200, 'Donations report generated successfully')
  @Example<{ status: string; statusCode: number; message: string; report: any[]; firstDonationCount: number }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
  ): Promise<{ status: string; statusCode: number; message: string; report?: any[]; firstDonationCount?: number; hallwiseReport?: Record<number, { report: any[]; firstDonationCount: number }> }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reportResult: {data: donationInterface.IDonationCountByBloodGroup[], message: string, status: string} = await donationInterface.getDonationCountByTimePeriod(startDate, endDate)
    const countOfFirstTimeDonationsOfDonors: {data: number, message: string, status: string} = await donorInterface.getCountOfDonorsWhoDonatedForTheFirstTime(startDate, endDate)
    const hallwiseReportResult: {data: Record<number, donationInterface.IDonationCountByBloodGroup[]>, message: string, status: string} = await donationInterface.getDonationCountByTimePeriodGroupedByHall(startDate, endDate)
    const hallwiseFirstDonationResult: {data: Record<number, number>, message: string, status: string} = await donorInterface.getCountOfDonorsWhoDonatedForTheFirstTimeGroupedByHall(startDate, endDate)

    // Combine the per-hall report and per-hall first-time counts into a single hall-keyed map
    const hallwiseReport: Record<number, { report: donationInterface.IDonationCountByBloodGroup[]; firstDonationCount: number }> = {}
    const hallKeys: Set<string> = new Set<string>([...Object.keys(hallwiseReportResult.data), ...Object.keys(hallwiseFirstDonationResult.data)])
    hallKeys.forEach((key: string): void => {
      const hall: number = Number(key)
      hallwiseReport[hall] = {
        report: hallwiseReportResult.data[hall] ?? [],
        firstDonationCount: hallwiseFirstDonationResult.data[hall] ?? 0
      }
    })

    await logInterface.addLog(user._id, 'GET DONATIONS REPORT', {
      ...reportResult.data,
      name: user.name
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: reportResult.message,
      report: reportResult.data,
      firstDonationCount: countOfFirstTimeDonationsOfDonors.data,
      hallwiseReport
    }
  }

  /**
   * List the donations behind a single cell of the donation report (Super Admin only).
   * The cell is identified by the time window it covers plus its blood group and hall;
   * pass bloodGroup = -1 for the report's 'Total' column and hall = -1 for 'All Halls'.
   */
  @Get('report/donors')
  @SuccessResponse(200, 'Fetched donations with donors for the time period')
  @Example<{ status: string; statusCode: number; message: string; donations: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Fetched donations with donors for the time period',
    donations: [{
      donorId: '5e901d56effc590017712345',
      name: 'Mr. Donor',
      bloodGroup: 2,
      hall: 5,
      date: 1611100800000
    }]
  })
  @Middlewares([donationValidator.validateGETDonationsReportDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getDonationsReportDonors(
    @Query() startDate: number,
    @Query() endDate: number,
    @Query() bloodGroup: number,
    @Query() hall: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donations?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const donationsResult: {data: donationInterface.IDonationWithDonor[], message: string, status: string} =
      await donationInterface.getDonationsWithDonorByTimePeriod(startDate, endDate, bloodGroup, hall)

    await logInterface.addLog(user._id, 'GET DONATIONS REPORT DONORS', {
      startDate,
      endDate,
      bloodGroup,
      hall,
      resultCount: donationsResult.data.length,
      name: user.name
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: donationsResult.message,
      donations: donationsResult.data
    }
  }
}

