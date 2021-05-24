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

const donationInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 1,
    message:{
        status: "ERROR",
        message:"Please try again after 1 minute"
    }
});
const donorInsertionLimiter = rateLimit({
    windowMs: minute,
    max: 1,
    message:{
        status: "ERROR",
        message:"Please try again after 1 minute"
    }
});
const donorDeletionLimiter = rateLimit({
    windowMs: minute,
    max: 1,
    message:{
        status: "ERROR",
        message:"Please try again after 1 minute"
    }
});
const deleteDonationLimiter = rateLimit({
    windowMs: minute,
    max: 1,
    message: {
        status: "ERROR",
        message: "Please try again after 1 minute"
    }
});

module.exports={
    signInLimiter,
    donationInsertionLimiter,
    donorInsertionLimiter,
    deleteDonationLimiter,
    donorDeletionLimiter,
}
