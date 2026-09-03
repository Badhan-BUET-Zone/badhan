import 'reflect-metadata'
import { Controller, Delete, Example, Get, Middlewares, Request, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as plateletDonationInterface from '../db/interfaces/plateletDonationInterface'
import { IDonor } from '../db/models/Donor'
import { ILog } from '../db/models/Log'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import { HTTP_STATUS } from '../constants'

@Route('log')
@Tags('Logs')
export class LogsController extends Controller {
  /** Get donation statistics */
  @Get('statistics')
  @SuccessResponse(200, 'Statistics fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; statistics: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Statistics fetched successfully',
    statistics: {
      donorCount: 2600,
      donationCount: 1200,
      donationCountMadeByApp: 900,
      plateletDonationCount: 300,
      volunteerCount: 130
    }
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getStatistics(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; statistics?: any }> {
    const donorCount: { message: string; status: string; data: number } = await donorInterface.getCount()
    const donationCount: { message: string; status: string; data: number } = await donationInterface.getCount()
    const donationCountMadeByApp: { message: string; status: string; data: number } = await donationInterface.getCountMadeByApp()
    const plateletDonationCount: { message: string; status: string; data: number } = await plateletDonationInterface.getPlateletDonationCount()
    const volunteerCount: { message: string; status: string; data: number } = await donorInterface.getVolunteerCount()

    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    await logInterface.addLog(user._id, 'GET STATISTICS', { name: user.name })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Statistics fetched successfully',
      statistics: {
        donorCount: donorCount.data,
        donationCount: donationCount.data,
        donationCountMadeByApp: donationCountMadeByApp.data,
        plateletDonationCount: plateletDonationCount.data,
        volunteerCount: volunteerCount.data
      }
    }
  }

  /** Get donation logs grouped by year and month */
  @Get('donations')
  @SuccessResponse(200, 'Donation logs fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; countByYearMonth?: any }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Donation logs fetched successfully',
    countByYearMonth: {}
  })
  @Middlewares([rateLimiter.commonLimiter])
  public async getLogsDonations(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; countByYearMonth?: any }> {
    const donationYearMonthCountResult: { message: string; status: string; data: donationInterface.YearMonthCount } = await donationInterface.getDonationCountGroupedByYear()

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: donationYearMonthCountResult.message,
      countByYearMonth: donationYearMonthCountResult.data
    }
  }

  /** Get log counts by date */
  @Get()
  @SuccessResponse(200, 'Logs fetched successfully')
  @Example<{ status: string; statusCode: number; message: string; logs?: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Logs fetched successfully',
    logs: [{
      dateString: '2021-05-06',
      activeUserCount: 23,
      totalLogCount: 256
    }]
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getLogs(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; logs?: any[] }> {
    const logsResult: { data: ILog[]; status: string; message: string } = await logInterface.getLogs()

    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor
    await logInterface.addLog(user._id, 'GET LOGS', { resultCount: logsResult.data.length, name: user.name })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Logs fetched successfully',
      logs: logsResult.data
    }
  }

  /** Delete all logs */
  @Delete()
  @SuccessResponse(200, 'All logs deleted successfully')
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'All logs deleted successfully'
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async deleteLogs(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    await logInterface.deleteLogs()
    await logInterface.addLog(user._id, 'DELETE LOGS', {})

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'All logs deleted successfully'
    }
  }
}

