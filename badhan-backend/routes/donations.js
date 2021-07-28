let express = require('express');
let router = express.Router();
const donationController = require('../controllers/donationController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');

router.get('/',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handleGETDonations
);

router.post('/',
    rateLimiter.donationInsertionLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handlePOSTDonations
);


router.delete('/',
    rateLimiter.deleteDonationLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handleDeleteDonations
);

module.exports = router;
