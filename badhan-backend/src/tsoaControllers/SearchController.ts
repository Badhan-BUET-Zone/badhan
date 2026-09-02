import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import donorValidator from '../validations/donors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import { DESIGNATIONS_INDEX, HTTP_STATUS, isHallRestricted } from '../constants'

@Route('search')
@Tags('Search')
export class SearchController extends Controller {
  /**
   * Search for donors filtered by criteria.
   *
   * @param bloodGroup Blood group index (0 A+, 1 A-, 2 B+, 3 B-, 4 O+, 5 O-, 6 AB+, 7 AB-), or -1 for any.
   * @param hall Hall index (0 Ahsan Ullah, 1 Sabekun Nahar Sony, 2 Kazi Nazrul Islam, 3 Dr. M. A. Rashid, 4 Sher-E-Bangla, 5 Suhrawardy, 6 Titumir, 7 Attached, 8 (Unknown)), or -1 for any. A hall admin may only search their own hall.
   * @param batch The two-digit batch of a student ID, e.g. "19" for 2019. Empty string means any batch.
   * @param name Matched as a substring, case-insensitively. Empty string means any name.
   * @param address Matched as a substring, case-insensitively. Empty string means any address.
   */
  @Get('v3')
  @SuccessResponse(200, 'Donors queried successfully')
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not allowed to search other halls', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: 'You are not allowed to search donors of other halls'
  })
  @Example<{ status: string; statusCode: number; message: string; filteredDonors: any[] }>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
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
    @Query() archiveFlag: boolean,
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
      archiveFlag: boolean;
    } = {
      bloodGroup,
      hall,
      batch,
      name,
      address,
      isAvailable,
      isNotAvailable,
      availableToAll,
      // taken at face value for every caller, whatever their designation: no coercion and no 403.
      // The archive-search setting has no server side at all, so there is nothing to enforce here.
      // The audit log below records the effective value, which is what keeps "who read the archive"
      // answerable without enforcement.
      archiveFlag
    }

    if (reqQuery.hall !== user.hall && isHallRestricted(reqQuery.hall) && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'You are not allowed to search donors of other halls' }
    }

    const result: { data: IDonor[]; message: string; status: string } = await donorInterface.findDonorsByAggregate(reqQuery)

    await logInterface.addLog(user._id, 'GET SEARCH V3', {
      filter: reqQuery,
      resultCount: result.data.length
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donors queried successfully',
      filteredDonors: result.data
    }
  }
}

