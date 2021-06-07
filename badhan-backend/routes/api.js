let express = require('express');
let router = express.Router();


const donorController = require('../controllers/donorController');
const donationController = require('../controllers/donationController');
const logController = require('../controllers/logController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
let gplay = require('google-play-scraper');

/* GET home page. */
router.get('/', logController.handleGETOnlineCheck);

router.post('/v2/donor/insert',
    rateLimiter.donorInsertionLimiter,
    authenticator.handleAuthentication,
    donorController.handlePOSTInsertDonor
);

router.get('/v3/donor/details',
    authenticator.handleAuthentication,
    donorController.handleGETViewDonorDetails
);

//THIS IS A DEPRECATED ROUTE THAT WILL BE REMOVED. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
//APP VERSION <= 3.5.1 STILL USES IT
router.post('/v2/donor/details',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewDonorDetails
);

router.post('/v2/donor/details/self',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewDonorDetailsSelf
);

router.post('/v2/donor/search',
    authenticator.handleAuthentication,
    donorController.handlePOSTSearchDonors
);

router.post('/v2/donor/donations',
    authenticator.handleAuthentication,
    donationController.handleGETSeeHistory
);

router.post('/v2/donation/insert',
    rateLimiter.donationInsertionLimiter,
    authenticator.handleAuthentication,
    donationController.handlePOSTInsertDonation
);

router.post('/v2/donor/comment',
    authenticator.handleAuthentication,
    donorController.handlePOSTComment
);

router.post('/v2/donation/delete',
    rateLimiter.deleteDonationLimiter,
    authenticator.handleAuthentication,
    donationController.handlePOSTDeleteDonation
);

router.post('/v2/donor/password/change',
    authenticator.handleAuthentication,
    donorController.handlePOSTChangePassword
);

router.post('/v2/donor/edit',
    authenticator.handleAuthentication,
    donorController.handlePOSTEditDonor
);

router.post('/v2/admin/donor/delete',
    rateLimiter.donorDeletionLimiter,
    authenticator.handleAuthentication,
    donorController.handlePOSTDeleteDonor
);

/********Hall admin APIs*********/

router.post('/v2/admin/promote',
    authenticator.handleAuthentication,
    donorController.handlePOSTPromote
);

router.post('/v2/admin/volunteers',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewVolunteersOfOwnHall
);

router.get('/v1/admin/volunteers/all',
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    donorController.handleGETViewAllVolunteers,
)

router.post('/v2/admin/hall/change',
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    donorController.handlePOSTChangeAdmin
);

router.post('/v2/admin/hall/show',
    authenticator.handleAuthentication,
    donorController.handlePOSTShowHallAdmins
);

router.get('/v3/log/version',
    logController.handleGETAppVersion
);

//THIS IS A DEPRECATED ROUTE THAT WILL BE REMOVED ON 25 MAY 2022. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
//APP VERSION <= 3.5.1 STILL USES IT
router.get('/v2/version',(req,res,next)=>{

    /*
    #swagger.description = 'Get app info deployed to play store' */
    gplay.app({appId: 'com.mmmbadhan'})
        .then((response)=>{
            res.status(200).send(response)
        });
});

router.get('/v2/log/statistics',
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETStatistics
);

router.get('/v1/log',
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleGETLogs
);

router.delete('/v1/log',
    authenticator.handleAuthentication,
    authenticator.handleSuperAdminCheck,
    logController.handleDELETELogs
);

module.exports = router;
