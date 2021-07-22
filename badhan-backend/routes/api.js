let express = require('express');
let router = express.Router();


const donorController = require('../controllers/donorController');
const donationController = require('../controllers/donationController');
const logController = require('../controllers/logController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
let gplay = require('google-play-scraper');

router.post('/donors',
    rateLimiter.donorInsertionLimiter,
    authenticator.handleAuthentication,
    donorController.handlePOSTDonors
);

router.get('/donors',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    donorController.handleGETDonors
);

router.get('/donors/me',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    donorController.handleGETDonorsMe
);

router.get('/search',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    donorController.handleGETSearch
);

router.get('/donations',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    donationController.handleGETDonations
);

router.post('/donations',
    rateLimiter.donationInsertionLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    donationController.handlePOSTDonations
);


router.delete('/donations',
    rateLimiter.deleteDonationLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    donationController.handleDeleteDonations
);

router.patch('/donors/comment',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    donorController.handlePATCHDonorsComment
);

router.patch('/donors/password',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    authenticator.handleHigherDesignationCheck,
    donorController.handlePATCHDonorsPassword
);

router.patch('/donors',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    authenticator.handleHigherDesignationCheck,
    donorController.handlePATCHDonors
);

router.delete('/donors',
    rateLimiter.donorDeletionLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    authenticator.handleHigherDesignationCheck,
    donorController.handleDELETEDonors
);

router.patch('/donors/designation',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    authenticator.handleHallAdminCheck,
    donorController.handlePATCHDonorsDesignation
);

router.get('/volunteers',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    donorController.handleGETVolunteers
);

router.get('/volunteers/all',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    donorController.handleGETVolunteersAll,
)

router.patch('/admins',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    donorController.handlePATCHAdmins
);

router.get('/admins',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    donorController.handleGETAdmins
);

router.get('/v3/log/version',
    rateLimiter.commonLimiter,
    logController.handleGETAppVersion
);

router.get('/v2/log/statistics',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETStatistics
);

router.get('/v1/log',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETLogs
);

router.delete('/v1/log',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleDELETELogs
);

module.exports = router;
