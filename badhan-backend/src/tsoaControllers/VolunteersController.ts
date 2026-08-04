import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Request, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import { HTTP_STATUS } from '../constants'

@Route('volunteers')
@Tags('Volunteers')
export class VolunteersController extends Controller {
  /** Get all designated donors (Super Admin only) */
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
      designation: 3
    }]
  })
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication, authenticator.handleSuperAdminCheck])
  public async getAllDonors(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; data?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const allDonorResult: { data: IDonor[]; message: string; status: string } = await donorInterface.findAllDonors()

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
}

