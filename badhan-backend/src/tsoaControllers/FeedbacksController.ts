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
   * `x-auth` header and must still get 200. A volunteer generating a registration QR code
   * calls this very same route with their own phone and student id.
   *
   * ONE OPTIONAL FIELD BRANCHES IT, AND THE BRANCH IS KEYED ON THE BODY, NOT ON THE SESSION:
   *
   *   { phone, studentId }        no session   → the token carries the matched donor's hall
   *   { phone, studentId, hall }  session       → the token carries `hall`, if the caller may
   *                                               state it
   *
   * A request that states no hall is answered identically whether or not somebody is signed
   * in — the handler never inspects the session on that path — which is what keeps the public
   * behaviour of this route one thing. Stating a hall is what requires a session, and it is
   * also what makes minting attributable at last.
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
  // The validator runs first, so a malformed `hall` is a 400 here rather than a 401 below.
  // handleAuthenticationIfHallStated runs last and only bites when `hall` is present.
  @Middlewares([
    feedbackValidator.validatePOSTToken,
    rateLimiter.feedbackTokenLimiter,
    authenticator.handleAuthenticationIfHallStated
  ])
  public async postToken(
    @Body() body: { phone: number; studentId: string; durationMinutes?: number; hall?: number },
    @Request() req: any
  ): Promise<IPostTokenResponse> {
    const lookupResult: { data?: IPublicDonorProfile; message: string; status: string } =
      await donorInterface.findPublicDonorProfile(body.phone, body.studentId)

    if (lookupResult.status !== 'OK' || !lookupResult.data) {
      this.setStatus(HTTP_STATUS.NOT_FOUND)
      return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: MINT_FAILURE_MESSAGE }
    }

    const profile: IPublicDonorProfile = lookupResult.data

    // Only a hall travels into the token. The phone and student id found this record; they
    // go no further, because a registration token is printed into a QR code that a room
    // full of students can decode.
    //
    // Which hall depends on the one optional field. Absent → the matched donor's own, which
    // is the whole of the anonymous path and is unchanged.
    let tokenHall: number = profile.hall
    const hallStated: boolean = body.hall !== undefined && body.hall !== null
    let requester: IDonor | null = null

    if (hallStated) {
      // Only reachable with a session: handleAuthenticationIfHallStated answered 401 otherwise.
      requester = (req as any).res.locals.middlewareResponse.donor

      // The same comparison SearchController and DonorsController use. HALL_ANY needs no
      // clause of its own — no member's hall is -1, so this rejects an "All Halls" request
      // from anyone below super admin by the same test.
      //
      // ATTACHED and UNKNOWN never get this far: validateBODYQrHall refuses them for every
      // caller, super admin included, because a code is something you make for a hall you
      // belong to and nobody belongs to either of those.
      if (requester!.designation !== DESIGNATIONS_INDEX.SUPER_ADMIN && body.hall !== requester!.hall) {
        this.setStatus(HTTP_STATUS.FORBIDDEN)
        return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN, message: NOT_AUTHORIZED_MESSAGE }
      }

      tokenHall = body.hall!
    }

    const minted: { token: string; expiresAt: number } =
      feedbackToken.mintFeedbackToken(tokenHall, body.durationMinutes)

    // No log entry when no hall is stated: logInterface.addLog needs a user id and there is
    // no session on that path. A request that states a hall has one, and is logged — which
    // is what makes generating a registration QR attributable at last.
    if (hallStated) {
      await logInterface.addLog(requester!._id, 'POST FEEDBACK TOKEN', {
        hall: tokenHall,
        durationMinutes: body.durationMinutes,
        expiresAt: minted.expiresAt
      })
    }

    // Built field by field. Never spread the document, never toObject() it — that is how
    // an address or a comment ends up on a public page. It is the CALLER'S OWN record on
    // both branches, looked up from the phone and student id they sent, so a super admin
    // minting for another hall learns nothing about that hall.
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
    let matchedDonor: IPublicDonorProfile | null = null
    if (body.type === FEEDBACK_TYPES.FEEDBACK) {
      const donorLookup: { data?: IPublicDonorProfile; message: string; status: string } =
        await donorInterface.findPublicDonorProfile(body.feedbackJSON.phone, body.feedbackJSON.studentId)
      if (donorLookup.status !== 'OK' || !donorLookup.data) {
        this.setStatus(HTTP_STATUS.NOT_FOUND)
        return { status: 'ERROR', statusCode: HTTP_STATUS.NOT_FOUND, message: MINT_FAILURE_MESSAGE }
      }
      matchedDonor = donorLookup.data
    }

    // 5. THE HALL COMES FROM THE TOKEN IN EVERY CASE THE TOKEN NAMES ONE.
    //
    //   token hall   type       row hall                    decided by
    //   ----------   --------   -------------------------   ---------------------------
    //   a real hall  feedback   the token's                  the token
    //   a real hall  newDonor   the token's                  the token
    //   HALL_ANY     feedback   the fetched donor's hall     the server, from a record
    //   HALL_ANY     newDonor   feedbackJSON.hall            THE SUBMITTER
    //
    // Rows one and two are unchanged and must stay that way: a newDonor payload carries its
    // own `hall` — NewPersonCard's key list requires it — and under a hall-bearing token that
    // value is stored inside the JSON for the volunteer to read and has NO effect on the
    // column. Do not "simplify" this by always reading body.feedbackJSON.hall: the body is
    // attacker-controlled and the token is not.
    //
    // HALL_ANY is the exception, and it is the point of an "All Halls" code: nobody named a
    // hall when the code was made, so the submission names it. For a message that means the
    // hall of the donor just fetched — a database record, not the body. For a registration it
    // means the payload's hall, which the payload validator has already pinned to one of the seven
    // (HALL_INDICES_ALLOWED_FOR_DONOR_CREATION, which excludes -1 and (Unknown) — do not relax
    // that check; it is what makes this branch safe).
    let rowHall: number = verification.hall
    if (verification.hall === HALL_ANY) {
      rowHall = body.type === FEEDBACK_TYPES.FEEDBACK ? matchedDonor!.hall : body.feedbackJSON.hall
    }

    // HALL_ANY must never be stored. Unreachable given the two branches above; it exists so
    // that a future third `type` cannot reach the collection with -1 and fail as a 500 in the
    // model's own hall validator.
    //
    // The set stays the WIDER one — the one a record may hold, not the one a creation may name.
    // A `feedback` row's hall comes from a matched donor's record, and that record may legitimately
    // still be (Unknown); narrowing this to the creation set would 400 those messages.
    if (![...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED].includes(rowHall)) {
      this.setStatus(HTTP_STATUS.BAD_REQUEST)
      return { status: 'ERROR', statusCode: HTTP_STATUS.BAD_REQUEST, message: MINT_FAILURE_MESSAGE }
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
