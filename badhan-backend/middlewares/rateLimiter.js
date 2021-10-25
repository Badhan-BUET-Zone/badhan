const rateLimit = require("express-rate-limit");
const {TooManyRequestsError429}= require('../response/errorTypes');

const devDisable = process.env.NODE_ENV === 'development'?1000:1;
const minute = 60*1000;
const commonRateLimiterError = new TooManyRequestsError429("Service unavailable");

const signInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3*devDisable,
    message:new TooManyRequestsError429("Please try again after 5 minutes")
});

const redirectionSignInLimiter = rateLimit({
    windowMs: minute,
    max: 3*devDisable,
    message:commonRateLimiterError
});

const donationInsertionLimiter = rateLimit({
    windowMs: 10*minute,
    max: 240*devDisable,
    message:commonRateLimiterError
});
const donorInsertionLimiter = rateLimit({
    windowMs: 10*minute,
    max: 240*devDisable,
    message:commonRateLimiterError
});
const donorDeletionLimiter = rateLimit({
    windowMs: 10*minute,
    max: 240*devDisable,
    message:commonRateLimiterError
});
const deleteDonationLimiter = rateLimit({
    windowMs: 10*minute,
    max: 240*devDisable,
    message: commonRateLimiterError
});

const commonLimiter = rateLimit({
    windowMs: 10*minute,
    max: 240*devDisable,
    message: commonRateLimiterError
});

const passwordRequestLimiter = rateLimit({
    windowMs: minute,
    max: 3*devDisable,
    message: commonRateLimiterError
});

const passwordForgotLimiter = rateLimit({
    windowMs: 3 * minute,
    max: 1*devDisable,
    message: new TooManyRequestsError429("Please try again after 3 minutes")
});

const publicContactInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 12*devDisable,
    message: commonRateLimiterError
})
const publicContactDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 12*devDisable,
    message: commonRateLimiterError
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
