import 'reflect-metadata'
import { Controller, Example, Get, Middlewares, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import donorValidator from '../validations/donors'
import rateLimiter from '../middlewares/rateLimiter'
import authenticator from '../middlewares/authenticate'
import { DESIGNATIONS_INDEX, HALL_ANY, HTTP_STATUS, isHallRestricted } from '../constants'

@Route('search')
@Tags('Search')
export class SearchController extends Controller {
  /**
   * Search for donors filtered by criteria.
   *
   * Every parameter is required. Send an empty string for a text filter you do not want, and
   * `true` for both `isAvailable` and `isNotAvailable` to ignore availability.
   *
   * A Super Admin can search every hall at once with `hall=-1`; anyone else gets 403 for it and
   * searches one hall per call.
   *
   * Example: every donor on record in Suhrawardy (hall 5), whatever their blood group or
   * availability, archived ones excluded:
   * `GET /search/v3?bloodGroup=-1&hall=5&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=false&archiveFlag=false`
   *
   * Example (Super Admin only): every A+ donor in every hall who can donate now:
   * `GET /search/v3?bloodGroup=0&hall=-1&batch=&name=&address=&isAvailable=true&isNotAvailable=false&availableToAll=false&archiveFlag=false`
   *
   * @param bloodGroup Blood group index (0 A+, 1 A-, 2 B+, 3 B-, 4 O+, 5 O-, 6 AB+, 7 AB-), or -1 for any.
   * @param hall Hall index: 0 Ahsan Ullah, 1 Sabekun Nahar Sony, 2 Kazi Nazrul Islam, 3 Dr. M. A. Rashid, 4 Sher-E-Bangla, 5 Suhrawardy, 6 Titumir, 8 (Unknown), or -1 for every hall (Super Admin only). 7 (Attached) is not accepted and answers 400. Below Super Admin, a caller may search only their own hall and 8 (Unknown); any other hall, and -1, answers 403.
   * @param batch The two-digit batch of a student ID, e.g. "19" for 2019. Empty string means any batch.
   * @param name Matched as a substring, case-insensitively. Empty string means any name.
   * @param address Matched as a substring, case-insensitively. Empty string means any address.
   * @param isAvailable Include donors who can donate now: no blood donation in the last 120 days and no platelet donation in the last 12 days.
   * @param isNotAvailable Include donors who cannot donate yet: a blood donation in the last 120 days or a platelet donation in the last 12 days. Combined with isAvailable as OR, so both true means any availability, and both false returns nobody.
   * @param availableToAll false: return the donors of `hall`. true: ignore `hall` as a filter and return only donors marked available to all, from every hall. `hall` must still be a valid index, and still passes the permission check.
   * @param archiveFlag false: only donors who are not archived, which is the ordinary search. true: only archived donors.
   */
  @Get('v3')
  @SuccessResponse(200, 'Donors queried successfully')
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Not allowed to search other halls, or every hall', {
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

    // Checked on its own, ahead of the hall rule below — which would refuse -1 too, but only
    // because -1 happens to sort below Titumir in isHallRestricted. Every hall at once is a
    // super admin's search, and saying so is clearer than relying on that.
    if (reqQuery.hall === HALL_ANY && user.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: 'Only super admins can search every hall at once' }
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

