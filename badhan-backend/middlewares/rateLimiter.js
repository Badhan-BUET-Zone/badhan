const rateLimit = require("express-rate-limit");
const minute = 60*1000
const signInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3,
    message:{
        status: "ERROR",
        message:"Please try again after 5 minutes"
    }
});

const redirectionSignInLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 3,
    message:{
        status: "ERROR",
        message:"Service unavailable!!"
    }
});

const donationInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message:{
        status: "ERROR",
        message:"Service unavailable!!"
    }
});
const donorInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 12,
    message:{
        status: "ERROR",
        message:"Service unavailable!!"
    }
});
const donorDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message:{
        status: "ERROR",
        message:"Service unavailable!!"
    }
});
const deleteDonationLimiter = rateLimit({
    windowMs: minute,
    max: 6,
    message: {
        status: "ERROR",
        message: "Service unavailable!!"
    }
});

const commonLimiter = rateLimit({
    windowMs: minute,
    max: 12,
    message: {
        status: "ERROR",
        message: "Service unavailable!!"
    }
});

const passwordRequestLimiter = rateLimit({
    windowMs: minute,
    max: 2,
    message: {
        status: "ERROR",
        message: "Service unavailable!!"
    }
});

const passwordForgotLimiter = rateLimit({
    windowMs: 5 * minute,
    max: 1,
    message: {
        status: "ERROR",
        message: "Service unavailable!!"
    }
});

module.exports={
    signInLimiter,
    donationInsertionLimiter,
    donorInsertionLimiter,
    deleteDonationLimiter,
    donorDeletionLimiter,
    redirectionSignInLimiter,
    commonLimiter,
    passwordRequestLimiter,
    passwordForgotLimiter
}
