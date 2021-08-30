let express = require('express');
let router = express.Router();
const logController = require('../controllers/logController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');

const logValidator = require('../validations/logs');

router.get('/v3/log/version',
    rateLimiter.commonLimiter,
    logController.handleGETAppVersion
);

router.get('/log/version',
    rateLimiter.commonLimiter,
    logController.handleGETAppVersion
);

router.get('/log/statistics',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETStatistics
);

router.delete('/log',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleDELETELogs
);

router.get('/log/date/:date/donorId/:donorId',
    logValidator.validateGETLogsByDateAndDonor,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETLogsByDateAndDonor
);

router.get('/log/date/:date',
    logValidator.validateGETLogsByDate,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETLogsByDate
);

router.get('/log',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETLogs
);

module.exports = router;
