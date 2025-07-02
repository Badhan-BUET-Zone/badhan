import dotenv from '../dotenv'
import rateLimit from 'express-rate-limit'
import TooManyRequestsError429 from "../response/models/errorTypes/TooManyRequestsError429";
import { RequestHandler} from "express";
const rateLimiterEnabled: number = dotenv.RATE_LIMITER_ENABLE === 'true' ? 1 : 100
const minute: number = 60 * 1000

const commonRateLimiterError: TooManyRequestsError429 = new TooManyRequestsError429('Service unavailable',{})

const signInLimiter: RequestHandler = rateLimit({
  windowMs: 5 * minute,
  max: 3 * rateLimiterEnabled,
  message: new TooManyRequestsError429('Please try again after 5 minutes',{})
})

const redirectionSignInLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 3 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const donationInsertionLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const donorInsertionLimiter: RequestHandler = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
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

const passwordForgotLimiter: RequestHandler = rateLimit({
  windowMs: 3 * minute,
  max: 1,
  message: new TooManyRequestsError429('Please try again after 3 minutes',{})
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
  donationInsertionLimiter,
  donorInsertionLimiter,
  deleteDonationLimiter,
  donorDeletionLimiter,
  redirectionSignInLimiter,
  commonLimiter,
  passwordRequestLimiter,
  passwordForgotLimiter,
  publicContactInsertionLimiter,
  publicContactDeletionLimiter
}
