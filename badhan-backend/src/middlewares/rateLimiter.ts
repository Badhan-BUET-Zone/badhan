import dotenv from '../dotenv'
import rateLimit from 'express-rate-limit'
import TooManyRequestsError429 from "../response/models/errorTypes/TooManyRequestsError429";
import { RequestHandler, Request, Response, NextFunction } from "express";
// The flag means what it says: off is OFF, not "a hundred times looser".
//
// It used to multiply every budget by 100, which reads as disabled and is not. The test suite
// makes one sign-in per test — the database is purged between tests, so a cached session cannot
// survive — and at a hundredfold budget that is still a ceiling of 300 sign-ins per five
// minutes. The suite reached it: every suite passed alone while the full run failed sixty tests
// on 429s from /users/signin, which looks like a broken feature and is a limiter nobody meant to
// arm. A multiplier large enough that no run can reach it removes the trap without changing what
// the flag means when it is on.
const rateLimiterEnabled: number = dotenv.RATE_LIMITER_ENABLE === 'true' ? 1 : 1000000
const minute: number = 60 * 1000

const commonRateLimiterError: TooManyRequestsError429 = new TooManyRequestsError429('Service unavailable',{})

const signInLimiter: RequestHandler = rateLimit({
  windowMs: 5 * minute,
  max: 3 * rateLimiterEnabled,
  message: new TooManyRequestsError429('Please try again after 5 minutes',{})
})

const donorDeletionLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const deleteDonationLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const commonLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const passwordRequestLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 3 * rateLimiterEnabled,
  message: commonRateLimiterError
})

// The feature's only guessing surface. POST /feedbacks/token answers differently for a
// phone/student-id pair that exists than for one that does not, which makes it an oracle
// for probing which donors are in the database. It gets its own budget rather than
// sharing commonLimiter so that tightening it after an abuse report does not throttle
// signed-in volunteers. A volunteer generating a QR code passes through it too, which is
// fine: that is a once-an-event action.
const feedbackTokenLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 10 * rateLimiterEnabled,
  message: commonRateLimiterError
})

// POST /feedbacks carries two budgets, chosen by the body's `type`. The asymmetry looks
// backwards — the anonymous bulk path is the LOOSE one — so do not collapse them:
//
//   newDonor (60/min) performs no lookup and discloses nothing. It has to absorb a room
//   of students at an intake event scanning a projected code, all behind one campus NAT;
//   a single-digit budget turns that room into a wall of 429s. A loose budget costs only
//   junk rows in one hall's queue, which is the blast radius already accepted.
//
//   feedback (10/min) fetches the donor, so a 201 rather than a 404 tells the caller that
//   a phone/student-id pair exists. That is the same disclosure feedbackTokenLimiter
//   rations, and the two oracles must share one story or an attacker just uses the wider
//   door.
const feedbackNewDonorLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 60 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const feedbackMessageLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 10 * rateLimiterEnabled,
  message: commonRateLimiterError
})

// Fails closed: a body whose `type` cannot be read gets the tighter budget. This runs
// before validation, so `type` here is untrusted — which is exactly why the default is
// the strict one rather than the permissive one.
const feedbackSubmissionLimiter: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const type: unknown = req.body === undefined || req.body === null ? undefined : req.body.type
  const limiter: RequestHandler = type === 'newDonor' ? feedbackNewDonorLimiter : feedbackMessageLimiter
  limiter(req, res, next)
}

// The member chat's send budget. High enough for a real back-and-forth during a blood-drive
// push, low enough that a scripted flood into a room EVERY member sees is capped. It gets its
// own budget rather than sharing commonLimiter because the read side of the same feature is on
// commonLimiter and a user scrolling history must not spend the budget for talking.
const messageSendLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 20 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const publicContactInsertionLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const publicContactDeletionLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})

export default {
  signInLimiter,
  deleteDonationLimiter,
  donorDeletionLimiter,
  commonLimiter,
  passwordRequestLimiter,
  publicContactInsertionLimiter,
  publicContactDeletionLimiter,
  feedbackTokenLimiter,
  feedbackSubmissionLimiter,
  messageSendLimiter
}
