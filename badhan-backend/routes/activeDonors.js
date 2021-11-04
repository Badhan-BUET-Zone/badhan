const AsyncRouter = require("express-async-router").AsyncRouter;
let router = AsyncRouter();

const activeDonorController = require('../controllers/activeDonorController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
const activeDonorsValidator = require('../validations/activeDonors');

router.post('/', /*#swagger.path = '/activeDonors'*/
    activeDonorsValidator.validatePOSTActiveDonors,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    activeDonorController.handlePOSTActiveDonors,
);

router.delete('/:donorId',/*#swagger.path = '/activeDonors/{donorId}'*/
    activeDonorsValidator.validateDELETEActiveDonors,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    activeDonorController.handleDELETEActiveDonors
);

module.exports = router;
