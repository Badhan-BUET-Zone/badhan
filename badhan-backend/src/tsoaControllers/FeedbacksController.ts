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
import { DESIGNATIONS_INDEX, HALLS_INDEX, HALL_ANY, HALL_INDICES_ALLOWED_FOR_DONOR, HTTP_STATUS } from '../constants'

// Every failure of a phone/student-id match answers with this, byte for byte, on BOTH routes
// that perform one — the lookup and a `feedback` submission. No match, phone matched but
// student id did not, student id matched but phone did not, more than one record matched — all
// the same 404. Anything that distinguishes them turns the endpoint into an oracle for probing
// which phone numbers exist. The text is printed in the manual and in the public page's own
// copy; change it in all three or in none.
const LOOKUP_FAILURE_MESSAGE: string = 'Information does not match. Please contact a volunteer.'

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

export interface IPostDonorLookupResponse {
  status: string
  statusCode: number
  message: string
  donor?: IPublicDonorSummary
}

export interface IPostRegistrationTokenResponse {
  status: string
  statusCode: number
  message: string
  // Absent on every failure, and on success it is the whole answer. There is deliberately no
  // `expiresAt` beside it: the token has no expiry, and a null field here would have every
  // caller wondering whether one was meant to arrive.
  token?: string
}

@Route('feedbacks')
@Tags('Feedbacks')
export class FeedbacksController extends Controller {
  /**
   * Look a donor up from the two things they know about themselves.
   *
   * Unauthenticated on purpose: a donor arriving from a printed QR code sends no `x-auth`
   * header and must still get 200. This is the first half of /#/donor — they see their own
   * record, then write a message — and it is ALL it does.
   *
   * IT RETURNS NO CREDENTIAL. There is nothing to carry from here to the submission: a message
   * is filed by sending the same phone and student id again, which the submit route matches for
   * itself. That is why this route can be as public as it is — a 200 here authorises nothing.
   */
  @Post('donorLookup')
  @SuccessResponse(200, 'Donor fetched successfully')
  @Response<{ status: string; statusCode: number; message: string }>(404, 'Information does not match', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: LOOKUP_FAILURE_MESSAGE
  })
  @Example<IPostDonorLookupResponse>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Donor fetched successfully',
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
  @Middlewares([
    feedbackValidator.validatePOSTDonorLookup,
    rateLimiter.feedbackLookupLimiter
  ])
  public async postDonorLookup(
    @Body() body: { phone: number; studentId: string }
  ): Promise<IPostDonorLookupResponse> {
    const lookupResult: { data?: IPublicDonorProfile; message: string; status: string } =
      await donorInterface.findPublicDonorProfile(body.phone, body.studentId)

    if (lookupResult.status !== 'OK' || !lookupResult.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: LOOKUP_FAILURE_MESSAGE }
    }

    const profile: IPublicDonorProfile = lookupResult.data

    // Built field by field. Never spread the document, never toObject() it — that is how an
    // address or a comment ends up on a public page. It is the CALLER'S OWN record, found from
    // the phone and student id they sent, so this discloses nothing they did not already state
    // except the record behind it.
    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Donor fetched successfully',
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
   * Mint the credential behind a registration QR code.
   *
   * AUTHENTICATED, unconditionally — the one route in this feature that is. A registration code
   * is a member's act: they choose a hall, the server says whether they may, and the log records
   * who asked. The body is a hall and nothing else; the session says who the caller is, which is
   * strictly better than a phone and a student id they could have typed.
   *
   * The token it returns NEVER EXPIRES AND CANNOT BE WITHDRAWN. Nothing here can undo a code
   * once it is made — see services/feedbackToken.ts — so this log entry is the only record that
   * a permanent door was opened, and the panel warns in those words before the button is pressed.
   */
  @Post('registrationToken')
  @SuccessResponse(200, 'Token generated successfully')
  @Response<{ status: string; statusCode: number; message: string }>(403, 'Hall not permitted', {
    status: 'ERROR',
    statusCode: HTTP_STATUS.FORBIDDEN,
    message: NOT_AUTHORIZED_MESSAGE
  })
  @Example<IPostRegistrationTokenResponse>({
    status: 'OK',
    statusCode: HTTP_STATUS.OK,
    message: 'Token generated successfully',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  // The validator runs first, so a malformed or disallowed `hall` is a 400 rather than a 401.
  @Middlewares([
    feedbackValidator.validatePOSTRegistrationToken,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication
  ])
  public async postRegistrationToken(
    @Body() body: { hall: number },
    @Request() req: any
  ): Promise<IPostRegistrationTokenResponse> {
    const requester: IDonor = (req as any).res.locals.middlewareResponse.donor

    // The same comparison SearchController and DonorsController use. HALL_ANY needs no clause of
    // its own — no member's hall is -1, so this rejects an "All Halls" request from anyone below
    // super admin by the same test.
    //
    // ATTACHED and UNKNOWN never get this far: validateBODYQrHall refuses them for every caller,
    // super admin included, because a code is something you make for a hall you belong to and
    // nobody belongs to either of those.
    if (requester.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN && body.hall !== requester.hall) {
      this.setStatus(HTTP_STATUS.FORBIDDEN)
      return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: NOT_AUTHORIZED_MESSAGE }
    }

    const minted: { token: string } = feedbackToken.mintFeedbackToken(body.hall)

    await logInterface.addLog(requester._id, 'POST FEEDBACK REGISTRATION TOKEN', {
      hall: body.hall
    })

    this.setStatus(HTTP_STATUS.OK)
    return {
      status: 'OK',
      statusCode: HTTP_STATUS.OK,
      message: 'Token generated successfully',
      token: minted.token
    }
  }

  /**
   * File a submission. The one write the public side can perform.
   *
   * NOTE: this verb is anonymous while GET and DELETE on the same path require a
   * session. That is the only place in the project where one path is public under one
   * verb and authenticated under another, and it is deliberate — adding
   * authenticator.handleAuthentication here would break every printed QR code and lock out
   * every donor, none of whom has an account.
   *
   * What authorises a write depends on `type`, and the validator has already enforced which
   * credential may be present: a message carries a phone and a student id and NO token, a
   * registration carries a token and no credentials of its own.
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
    message: LOOKUP_FAILURE_MESSAGE
  })
  @Example<{ status: string; statusCode: number; message: string }>({
    status: 'OK',
    statusCode: HTTP_STATUS.CREATED,
    message: SUBMISSION_SUCCESS_MESSAGE
  })
  @Middlewares([feedbackValidator.validatePOSTFeedback, rateLimiter.feedbackSubmissionLimiter])
  public async postFeedback(
    @Body() body: { token?: string; type: FeedbackType; feedbackJSON: any }
  ): Promise<{ status: string; statusCode: number; message: string }> {
    // `type` selected the payload rules in the validator, which is also where the credential
    // rule was applied in both directions: a newDonor body without a token never reaches here,
    // and neither does a feedback body WITH one. body.feedbackJSON arrives already validated,
    // escaped where it should be, and defaulted.
    //
    // THE TWO KINDS ARE AUTHORISED BY DIFFERENT THINGS, AND THAT IS THE WHOLE SHAPE OF THIS
    // HANDLER:
    //
    //   type       authorised by            row hall                      decided by
    //   --------   ----------------------   ---------------------------   ----------------------
    //   feedback   a matching donor record  THE MATCHED RECORD'S HALL     the server, from a row
    //   newDonor   the registration token   the token's hall              the token
    //   newDonor   (token says HALL_ANY)    feedbackJSON.hall             THE SUBMITTER
    //
    // A message's hall no longer comes from a token, because there is no token: the pair of
    // credentials finds one donor record, and that record's own hall is where the row belongs.
    // It is also the hall the queue's visibility filter assumes, so a message can no longer land
    // in a queue its donor does not belong to.
    let rowHall: number

    if (body.type === FEEDBACK_TYPES.FEEDBACK) {
      // The credential IS the lookup. A pair that matches no record authorises nothing, and the
      // 404 that says so is the same one the lookup route answers, byte for byte.
      const donorLookup: { data?: IPublicDonorProfile; message: string; status: string } =
        await donorInterface.findPublicDonorProfile(body.feedbackJSON.phone, body.feedbackJSON.studentId)
      if (donorLookup.status !== 'OK' || !donorLookup.data) {
        this.setStatus(HTTP_STATUS.NOT_FOUND)
        return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: LOOKUP_FAILURE_MESSAGE }
      }
      rowHall = donorLookup.data.hall
    } else {
      // A registration is NOT matched against the donor collection: the whole premise is that
      // this person is not in the database yet, so a lookup would either find nothing every time
      // or block a genuine registration whose phone somebody else already holds. Duplicate
      // detection belongs in the creation form, with a human present.
      const verification: FeedbackTokenVerification = feedbackToken.verifyFeedbackToken(body.token!)
      if (!verification.valid) {
        // Expired and invalid are distinguished because one is actionable by the person holding
        // the phone — ask for a new code — and the other is not. Nothing mints an expiring token
        // any more, but codes printed before that change are still on walls.
        this.setStatus(HTTP_STATUS.UNAUTHORIZED)
        return {
          status: 'ERROR',
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          message: verification.reason === 'expired' ? TOKEN_EXPIRED_MESSAGE : TOKEN_INVALID_MESSAGE
        }
      }

      // The token's hall, except under an "All Halls" code — which is the point of one: nobody
      // named a hall when the code was made, so the submission names it. The payload validator
      // has already pinned that value to one of the seven
      // (HALL_INDICES_ALLOWED_FOR_DONOR_CREATION, which excludes -1 and (Unknown) — do not relax
      // that check; it is what makes this branch safe).
      //
      // Do not "simplify" this by always reading body.feedbackJSON.hall. A newDonor payload
      // carries its own `hall` — NewPersonCard's key list requires it — and under a hall-bearing
      // token that value is stored inside the JSON for the volunteer to read and has NO effect on
      // the column. The body is attacker-controlled and the token is not.
      rowHall = verification.hall === HALL_ANY ? body.feedbackJSON.hall : verification.hall
    }

    // HALL_ANY must never be stored. Unreachable given the branches above; it exists so
    // that a future third `type` cannot reach the collection with -1 and fail as a 500 in the
    // model's own hall validator.
    //
    // The set stays the WIDER one — the one a record may hold, not the one a creation may name.
    // A `feedback` row's hall comes from a matched donor's record, and that record may legitimately
    // still be (Unknown); narrowing this to the creation set would 400 those messages.
    if (![...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED].includes(rowHall)) {
      this.setStatus(HTTP_STATUS.BAD_REQUEST)
      return { status: 'ERROR', statusCode: HTTP_STATUS.BAD_REQUEST, message: LOOKUP_FAILURE_MESSAGE }
    }

    const insertion: { data: IFeedback; message: string; status: string } =
      await feedbackInterface.insertFeedback(body.type, rowHall, body.feedbackJSON)

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
