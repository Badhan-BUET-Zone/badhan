// @ts-nocheck
/* tslint:disable */
const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()

const activeDonorController = require('../controllers/activeDonorController')
const authenticator = require('../middlewares/authenticate')
const rateLimiter = require('../middlewares/rateLimiter')
const activeDonorsValidator = require('../validations/activeDonors')

router.post('/',
  activeDonorsValidator.validatePOSTActiveDonors,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  activeDonorController.handlePOSTActiveDonors
)

router.delete('/:donorId',
  activeDonorsValidator.validateDELETEActiveDonors,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  activeDonorController.handleDELETEActiveDonors
)

router.get('/',
  activeDonorsValidator.validateGETActiveDonors,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  activeDonorController.handleGETActiveDonors
)

export default router
