const rateLimit = require("express-rate-limit");
const {TooManyRequestsError429}= require('../response/errorTypes');

const devDisable = process.env.NODE_ENV === 'development'?1000:1;
const minute = 60*1000;
const commentRateLimiterError = new TooManyRequestsError429("Service unavailable");

const signInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3*devDisable,
    message:new TooManyRequestsError429("Please try again after 5 minutes")
});

const redirectionSignInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3*devDisable,
    message:commentRateLimiterError
});

const donationInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 2*devDisable,
    message:commentRateLimiterError
});
const donorInsertionLimiter = rateLimit({
    windowMs: 10*minute,
    max: 50*devDisable,
    message:commentRateLimiterError
});
const donorDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 2*devDisable,
    message:commentRateLimiterError
});
const deleteDonationLimiter = rateLimit({
    windowMs: minute,
    max: 6*devDisable,
    message: commentRateLimiterError
});

const commonLimiter = rateLimit({
    windowMs: 10*minute,
    max: 120*devDisable,
    message: commentRateLimiterError
});

const passwordRequestLimiter = rateLimit({
    windowMs: minute,
    max: 2*devDisable,
    message: commentRateLimiterError
});

const passwordForgotLimiter = rateLimit({
    windowMs: 3 * minute,
    max: 1*devDisable,
    message: new TooManyRequestsError429("Please try again after 3 minutes")
});

const publicContactInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 6*devDisable,
    message: commentRateLimiterError
})
const publicContactDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 6*devDisable,
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
