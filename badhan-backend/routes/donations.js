let express = require('express');
let router = express.Router();
const donationController = require('../controllers/donationController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
const donationValidator = require('../validations/donations');

router.get('/',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handleGETDonations
);

router.post('/',
    donationValidator.validatePOSTDonations,
    rateLimiter.donationInsertionLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handlePOSTDonations
);


router.delete('/',
    donationValidator.validateDELETEDonations,
    rateLimiter.deleteDonationLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    donationController.handleDeleteDonations
);

module.exports = router;
