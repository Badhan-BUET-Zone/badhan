const rateLimit = require("express-rate-limit");
const {TooManyRequestsError}= require('../response/errorTypes')
const minute = 60*1000
const commentRateLimiterError = new TooManyRequestsError("Service unavailable");

const signInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3,
    message:new TooManyRequestsError("Please try again after 5 minutes")
});

const redirectionSignInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3,
    message:commentRateLimiterError
});

const donationInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message:commentRateLimiterError
});
const donorInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 12,
    message:commentRateLimiterError
});
const donorDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message:commentRateLimiterError
});
const deleteDonationLimiter = rateLimit({
    windowMs: minute,
    max: 6,
    message: commentRateLimiterError
});

const commonLimiter = rateLimit({
    windowMs: minute,
    max: 12,
    message: commentRateLimiterError
});

const passwordRequestLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message: commentRateLimiterError
});

const passwordForgotLimiter = rateLimit({
    windowMs: 3 * minute,
    max: 1,
    message: new TooManyRequestsError("Please try again after 3 minutes")
});

const publicContactInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 6,
    message: commentRateLimiterError
})
const publicContactDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 6,
    message: commentRateLimiterError
})

module.exports={
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
