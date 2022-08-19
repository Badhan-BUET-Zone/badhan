// @ts-nocheck
/* tslint:disable */
import dotenv from '../dotenv'
const rateLimit = require('express-rate-limit')
import TooManyRequestsError429 from "../response/models/errorTypes/TooManyRequestsError429";
const rateLimiterEnabled = dotenv.RATE_LIMITER_ENABLE === 'true' ? 1 : 100
const minute = 60 * 1000

const commonRateLimiterError = new TooManyRequestsError429('Service unavailable')

const signInLimiter = rateLimit({
  windowMs: 5 * minute,
  max: 3 * rateLimiterEnabled,
  message: new TooManyRequestsError429('Please try again after 5 minutes')
})

const redirectionSignInLimiter = rateLimit({
  windowMs: minute,
  max: 3 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const donationInsertionLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const donorInsertionLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const donorDeletionLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const deleteDonationLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const commonLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const passwordRequestLimiter = rateLimit({
  windowMs: minute,
  max: 3 * rateLimiterEnabled,
  message: commonRateLimiterError
})

const passwordForgotLimiter = rateLimit({
  windowMs: 3 * minute,
  max: 1,
  message: new TooManyRequestsError429('Please try again after 3 minutes')
})

const publicContactInsertionLimiter = rateLimit({
  windowMs: minute,
  max: 12 * rateLimiterEnabled,
  message: commonRateLimiterError
})
const publicContactDeletionLimiter = rateLimit({
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
