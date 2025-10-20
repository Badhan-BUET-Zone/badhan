import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Request, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'

@Route('volunteers')
@Tags('Volunteers')
export class VolunteersController extends Controller {
  /** Get all designated donors (Super Admin only) */
  @Get('all')
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

