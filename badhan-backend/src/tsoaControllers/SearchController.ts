import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import donorValidator from '../validations/donors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'

@Route('search')
@Tags('Search')
export class SearchController extends Controller {
  /** Search for donors filtered by criteria */
  @Get('v3')
  @SuccessResponse(200, 'Donors queried successfully')
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not allowed to search other halls', {
    status: 'ERROR',
    statusCode: 403,
    message: 'You are not allowed to search donors of other halls'
  })
  @Example<{ status: string; statusCode: number; message: string; filteredDonors: any[] }>({
    status: 'OK',
    statusCode: 200,
    message: 'Donors queried successfully',
    filteredDonors: [{
      _id: '584abcde6744144441',
      name: 'Mir Mahathir Mohammad',
      phone: 8801500000000,
      hall: 5
    }]
  })
  @Middlewares([donorValidator.validateGETSearchDonors, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async searchDonors(
    @Query() bloodGroup: number,
    @Query() hall: number,
    @Query() batch: string,
    @Query() name: string,
    @Query() address: string,
    @Query() isAvailable: boolean,
    @Query() isNotAvailable: boolean,
    @Query() availableToAll: boolean,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; filteredDonors?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const reqQuery: {
      bloodGroup: number;
      hall: number;
      batch: string;
      name: string;
      address: string;
      isAvailable: boolean;
      isNotAvailable: boolean;
      availableToAll: boolean;
    } = {
      bloodGroup,
      hall,
      batch,
      name,
      address,
      isAvailable,
      isNotAvailable,
      availableToAll
    }

    if (reqQuery.hall !== user.hall && reqQuery.hall <= 6 && user.designation !== 3) {
      this.setStatus(403)
      return { status: 'ERROR', statusCode: 403, message: 'You are not allowed to search donors of other halls' }
    }

    const result: { data: IDonor[]; message: string; status: string } = await donorInterface.findDonorsByAggregate(reqQuery)

    await logInterface.addLog(user._id, 'GET SEARCH V3', {
      filter: reqQuery,
      resultCount: result.data.length
    })

    this.setStatus(200)
    return {
      status: 'OK',
      statusCode: 200,
      message: 'Donors queried successfully',
      filteredDonors: result.data
    }
  }
}

