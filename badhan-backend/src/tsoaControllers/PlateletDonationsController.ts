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
import { HTTP_STATUS } from '../constants'

@Route('platelet-donations')
@Tags('PlateletDonations')
export class PlateletDonationsController extends Controller {
  /** Insert a platelet donation */
  @Post()
  @SuccessResponse(201, 'Platelet donation inserted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(500, 'Internal server error', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal server error'
  })
  @Example<{ status: string; statusCode: number; message: string; newPlateletDonation: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
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
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: plateletDonationInsertionResult.message }
    }

    await logInterface.addLog(user._id, 'POST PLATELET DONATIONS', {
      ...plateletDonationInsertionResult.data,
      donor: targetDonor.name
    })

    this.setStatus(HTTP_STATUS.CREATED)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.CREATED,
      message: 'Platelet donation inserted successfully',
      newPlateletDonation: plateletDonationInsertionResult.data
    }
  }

  /** Delete a platelet donation */
  @Delete()
  @SuccessResponse(200, 'Deleted platelet donation successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Platelet donation not found', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'Matching platelet donation not found'
  })
  @Example<{ status: string; statusCode: number; message: string; deletedPlateletDonation: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: 'Matching platelet donation not found' }
    }

    await plateletDonationInterface.findLatestPlateletDonationByDonorId(targetDonor._id)

    await logInterface.addLog(user._id, 'DELETE PLATELET DONATIONS', {
      ...plateletDonationDeletionResult.data,
      name: targetDonor.name
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Deleted platelet donation successfully',
      deletedPlateletDonation: plateletDonationDeletionResult.data
    }
  }

  /** Get platelet donations report (Super Admin only) */
  @Get('report')
  @SuccessResponse(200, 'Platelet donations report generated successfully')
  @Example<{ status: string; statusCode: number; message: string; report: any[]; firstPlateletDonationCount: number }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
  ): Promise<{ status: string; statusCode: number; message: string; report?: any[]; firstPlateletDonationCount?: number; hallwiseReport?: Record<number, { report: any[]; firstPlateletDonationCount: number }> }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reportResult: { data: plateletDonationInterface.IPlateletDonationCountByBloodGroup[]; message: string; status: string } = await plateletDonationInterface.getPlateletDonationCountByTimePeriod(startDate, endDate)
    const countOfFirstTimePlateletDonationsOfDonors: { data: number; message: string; status: string } = await donorInterface.getCountOfDonorsWhoDonatedPlateletForTheFirstTime(startDate, endDate)
    const hallwiseReportResult: { data: Record<number, plateletDonationInterface.IPlateletDonationCountByBloodGroup[]>; message: string; status: string } = await plateletDonationInterface.getPlateletDonationCountByTimePeriodGroupedByHall(startDate, endDate)
    const hallwiseFirstDonationResult: { data: Record<number, number>; message: string; status: string } = await donorInterface.getCountOfDonorsWhoDonatedPlateletForTheFirstTimeGroupedByHall(startDate, endDate)

    // Combine the per-hall report and per-hall first-time counts into a single hall-keyed map
    const hallwiseReport: Record<number, { report: plateletDonationInterface.IPlateletDonationCountByBloodGroup[]; firstPlateletDonationCount: number }> = {}
    const hallKeys: Set<string> = new Set<string>([...Object.keys(hallwiseReportResult.data), ...Object.keys(hallwiseFirstDonationResult.data)])
    hallKeys.forEach((key: string): void => {
      const hall: number = Number(key)
      hallwiseReport[hall] = {
        report: hallwiseReportResult.data[hall] ?? [],
        firstPlateletDonationCount: hallwiseFirstDonationResult.data[hall] ?? 0
      }
    })

    await logInterface.addLog(user._id, 'GET PLATELET DONATIONS REPORT', {
      ...reportResult.data,
      name: user.name
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: reportResult.message,
      report: reportResult.data,
      firstPlateletDonationCount: countOfFirstTimePlateletDonationsOfDonors.data,
      hallwiseReport
    }
  }

  /**
   * List the platelet donations behind a single cell of the platelet report (Super Admin only).
   * The cell is identified by the time window it covers plus its blood group and hall;
   * pass bloodGroup = -1 for the report's 'Total' column and hall = -1 for 'All Halls'.
   */
  @Get('report/donors')
  @SuccessResponse(200, 'Fetched platelet donations with donors for the time period')
  @Example<{ status: string; statusCode: number; message: string; donations: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Fetched platelet donations with donors for the time period',
    donations: [{
      donorId: '5e901d56effc590017712345',
      name: 'Mr. Donor',
      bloodGroup: 2,
      hall: 5,
      date: 1611100800000
    }]
  })
  @Middlewares([plateletDonationValidator.validateGETPlateletDonationsReportDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getPlateletDonationsReportDonors(
    @Query() startDate: number,
    @Query() endDate: number,
    @Query() bloodGroup: number,
    @Query() hall: number,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; donations?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const donationsResult: { data: plateletDonationInterface.IPlateletDonationWithDonor[]; message: string; status: string } =
      await plateletDonationInterface.getPlateletDonationsWithDonorByTimePeriod(startDate, endDate, bloodGroup, hall)

    await logInterface.addLog(user._id, 'GET PLATELET DONATIONS REPORT DONORS', {
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

