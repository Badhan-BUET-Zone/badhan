import 'reflect-metadata'
import { Body, Controller, Delete, Example, Get, Middlewares, Post, Query, Request, Response, Route, SuccessResponse, Tags } from 'tsoa'
import type { Response as ExResponse } from 'express'
import * as donorInterface from '../db/interfaces/donorInterface'
import { IPublicDonorProfile } from '../db/interfaces/donorInterface'
import * as feedbackInterface from '../db/interfaces/feedbackInterface'
import { FeedbackType, FEEDBACK_TYPES, IFeedback } from '../db/models/Feedback'
import * as feedbackToken from '../services/feedbackToken'
import { FeedbackTokenVerification } from '../services/feedbackToken'
import * as logInterface from '../db/interfaces/logInterface'
import { IDonor } from '../db/models/Donor'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import feedbackValidator from '../validations/feedbacks'
import { HTTP_STATUS } from '../constants'

// Every failure of the mint route answers with this, byte for byte. No match, phone
// matched but student id did not, student id matched but phone did not, more than one
// record matched — all the same 404. Anything that distinguishes them turns the endpoint
// into an oracle for probing which phone numbers exist.
const MINT_FAILURE_MESSAGE: string = 'Information does not match. Please contact a volunteer.'

const TOKEN_EXPIRED_MESSAGE: string = 'This link has expired. Please scan again or ask a volunteer for a new code.'
const TOKEN_INVALID_MESSAGE: string = 'This link is not valid.'
const SUBMISSION_SUCCESS_MESSAGE: string = 'Thank you. Your message has reached the volunteers.'
const ALREADY_RESOLVED_MESSAGE: string = 'This feedback has already been resolved.'
const NOT_AUTHORIZED_MESSAGE: string = 'You are not authorized to access a donor of different hall'

export interface IPublicDonorSummary {
  name: string
  phone: number
  studentId: string
  bloodGroup: number
  hall: number
  donationCount: number
  plateletDonationCount: number
  lastDonation: number
  lastPlateletDonation: number
}

export interface IPostTokenResponse {
  status: string
  statusCode: number
  message: string
  token?: string
  expiresAt?: number
  donor?: IPublicDonorSummary
}

@Route('feedbacks')
@Tags('Feedbacks')
export class FeedbacksController extends Controller {
  /**
   * Mint a feedback submission token.
   *
   * Unauthenticated on purpose: a donor arriving from a printed QR code sends no
   * `x-auth` header and must still get 200. A signed-in volunteer generating a
   * registration QR code calls this very same route with their own phone and student id,
   * so there is no session branch and no second code path.
   */
  @Post('token')
  @SuccessResponse(200, 'Token generated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Information does not match', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: MINT_FAILURE_MESSAGE
  })
  @Example<IPostTokenResponse>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Token generated successfully',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    expiresAt: 1739011200000,
    donor: {
      name: 'Mir Mahathir Mohammad',
      phone: 8801500000000,
      studentId: '1605011',
      bloodGroup: 2,
      hall: 5,
      donationCount: 3,
      plateletDonationCount: 1,
      lastDonation: 1707000000000,
      lastPlateletDonation: 1707000000000
    }
  })
  @Middlewares([feedbackValidator.validatePOSTToken, rateLimiter.feedbackTokenLimiter])
  public async postToken(
    @Body() body: { phone: number; studentId: string; durationMinutes?: number }
  ): Promise<IPostTokenResponse> {
    const lookupResult: { data?: IPublicDonorProfile; message: string; status: string } =
      await donorInterface.findPublicDonorProfile(body.phone, body.studentId)

    if (lookupResult.status !== 'OK' || !lookupResult.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: MINT_FAILURE_MESSAGE }
    }

    const profile: IPublicDonorProfile = lookupResult.data

    // Only the hall travels into the token. The phone and student id found this record;
    // they go no further, because a registration token is printed into a QR code that a
    // room full of students can decode.
    const minted: { token: string; expiresAt: number } =
      feedbackToken.mintFeedbackToken(profile.hall, body.durationMinutes)

    // No log entry, ever. logInterface.addLog needs a user id and there is no session
    // here. The consequence is accepted and recorded: generating a registration QR is
    // unattributable — nothing records who made a code, for which hall, or for how long.

    // Built field by field. Never spread the document, never toObject() it — that is how
    // an address or a comment ends up on a public page.
    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Token generated successfully',
      token: minted.token,
      expiresAt: minted.expiresAt,
      donor: {
        name: profile.name,
        phone: profile.phone,
        studentId: profile.studentId,
        bloodGroup: profile.bloodGroup,
        hall: profile.hall,
        donationCount: profile.donationCount,
        plateletDonationCount: profile.plateletDonationCount,
        lastDonation: profile.lastDonation,
        lastPlateletDonation: profile.lastPlateletDonation
      }
    }
  }

  /**
   * File a submission. The one write the public side can perform.
   *
   * NOTE: this verb is anonymous while GET and DELETE on the same path require a
   * session. That is the only place in the project where one path is public under one
   * verb and authenticated under another, and it is deliberate — adding
   * authenticator.handleAuthentication here would break every printed QR code.
   */
  @Post()
  @SuccessResponse(201, 'Feedback submitted successfully')
  @Response<{ status: string; statusCode: number; message: string }>(401, 'The link is not valid or has expired', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: TOKEN_INVALID_MESSAGE
  })
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Information does not match', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: MINT_FAILURE_MESSAGE
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: SUBMISSION_SUCCESS_MESSAGE
  })
  @Middlewares([feedbackValidator.validatePOSTFeedback, rateLimiter.feedbackSubmissionLimiter])
  public async postFeedback(
    @Body() body: { token: string; type: FeedbackType; feedbackJSON: any }
  ): Promise<{ status: string; statusCode: number; message: string }> {
    // 1. The token. A valid one yields exactly one thing: a hall.
    const verification: FeedbackTokenVerification = feedbackToken.verifyFeedbackToken(body.token)
    if (!verification.valid) {
      // Expired and invalid are distinguished because one is actionable by the person
      // holding the phone — scan again — and the other is not.
      this.setStatus(HTTP_STATUS.UNAUTHORIZED)
      return {
        status: 'ERROR',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: verification.reason === 'expired' ? TOKEN_EXPIRED_MESSAGE : TOKEN_INVALID_MESSAGE
      }
    }

    // 2 and 3 happened in the validator: `type` selected the payload rules, and
    // body.feedbackJSON arrives already validated, escaped where it should be, and
    // defaulted.

    // 4. Only a message is matched against the donor collection. A registration is not,
    // because the whole premise is that this person is not in the database yet — and a
    // lookup would either find nothing every time or block a genuine registration whose
    // phone somebody else already holds. Duplicate detection belongs in the creation
    // form, with a human present.
    if (body.type === FEEDBACK_TYPES.FEEDBACK) {
      const donorLookup: { data?: IPublicDonorProfile; message: string; status: string } =
        await donorInterface.findPublicDonorProfile(body.feedbackJSON.phone, body.feedbackJSON.studentId)
      if (donorLookup.status !== 'OK') {
        this.setStatus(HTTP_STATUS.NOT_FOUND)
        return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: MINT_FAILURE_MESSAGE }
      }
    }

    // 5. THE HALL COMES FROM THE TOKEN, NEVER FROM THE BODY.
    //
    // A newDonor payload carries its own `hall` — NewPersonCard's key list requires it —
    // and the registration form now fixes that value to the token's, so the two will
    // normally be equal. Do not "simplify" this by reading body.feedbackJSON.hall: the
    // body is attacker-controlled and the token is not, and this is the only field a
    // submitter cannot aim. Nor is it read off the donor fetched in step 4.
    const insertion: { data: IFeedback; message: string; status: string } =
      await feedbackInterface.insertFeedback(body.type, verification.hall, body.feedbackJSON)

    if (insertion.status !== 'OK') {
      this.setStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      return { status: 'ERROR', statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: insertion.message }
    }

    // No log entry: there is no user id. The row is the record. No per-donor cap either —
    // one person may file several messages.
    this.setStatus(HTTP_STATUS.CREATED)
    return { status: 'OK', statusCode: HTTP_STATUS.CREATED, message: SUBMISSION_SUCCESS_MESSAGE }
  }

  /**
   * The queue, oldest first, filtered to what this member is allowed to see.
   *
   * There is no new permission concept: you see the feedback of the donors you can
   * already find in search. Filtering happens in the aggregate and never in the UI —
   * another hall's row must not reach the browser at all.
   *
   * No pagination, no `?type=` filter, no query parameter of any kind. The list is a work
   * queue meant to be emptied, and an unbounded one is the only signal anybody gets that
   * it is not being worked.
   */
  @Get()
  @SuccessResponse(200, 'Feedbacks fetched successfully')
  @Middlewares([rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async getFeedbacks(
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string; feedbacks?: any[] }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    const result: { data: any[]; message: string; status: string } = await feedbackInterface.findFeedbacksForUser(user)

    await logInterface.addLog(user._id, 'GET FEEDBACKS', { resultCount: result.data.length })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Feedbacks fetched successfully',
      feedbacks: result.data
    }
  }

  /**
   * Discard one row. It deletes the row and does nothing else — no donor is touched, no
   * donation is recorded, nothing is archived.
   */
  @Delete()
  @SuccessResponse(200, 'Feedback discarded successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Already resolved', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: ALREADY_RESOLVED_MESSAGE
  })
  @Middlewares([feedbackValidator.validateDELETEFeedback, rateLimiter.commonLimiter, authenticator.handleAuthentication])
  public async deleteFeedback(
    @Query() feedbackId: string,
    @Request() req: any
  ): Promise<{ status: string; statusCode: number; message: string }> {
    const res: ExResponse = (req as any).res
    const user: IDonor = res.locals.middlewareResponse.donor

    // 1. Gone before "not yours". Two volunteers discarding the same row at once is the
    // expected case, not an error: the first wins and the second is told plainly. The
    // frontend removes the card on this response as well as on success.
    const existing: { data?: IFeedback; message: string; status: string } =
      await feedbackInterface.findFeedbackById(feedbackId)
    if (existing.status !== 'OK' || !existing.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: ALREADY_RESOLVED_MESSAGE }
    }

    // 2. Then the visibility rule, the same one the list applies.
    const visible: boolean = await feedbackInterface.isFeedbackVisibleToUser(existing.data, user)
    if (!visible) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: NOT_AUTHORIZED_MESSAGE }
    }

    const deletion: { data?: IFeedback; message: string; status: string } =
      await feedbackInterface.deleteFeedbackById(feedbackId)
    if (deletion.status !== 'OK' || !deletion.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: ALREADY_RESOLVED_MESSAGE }
    }

    // 3. The full submission goes into the log, written only after a successful delete so
    // a failed one leaves no misleading entry. Discard is permanent for the volunteer;
    // this is what still lets a super admin recover what was discarded.
    await logInterface.addLog(user._id, 'DELETE FEEDBACKS', {
      feedbackId,
      type: deletion.data.type,
      hall: deletion.data.hall,
      feedbackJSON: deletion.data.feedbackJSON,
      date: deletion.data.date
    })

    this.setStatus(HTTP_STATUS.OK)
    return { status: 'OK', statusCode: HTTP_STATUS.OK, message: 'Feedback discarded successfully' }
  }
}
