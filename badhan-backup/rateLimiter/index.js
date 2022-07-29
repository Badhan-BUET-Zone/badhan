const rateLimit = require('express-rate-limit')
const { TooManyRequestsError429 } = require('../response/errorTypes')

const minute = 60 * 1000

const commonLimiter = rateLimit({
    windowMs: minute,
    max: 12,
    message: new TooManyRequestsError429('Service unavailable',{})
})

module.exports = {
    commonLimiter
}
