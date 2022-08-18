// @ts-nocheck
/* tslint:disable */
const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()
const donationController = require('../controllers/donationController')
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
const donationValidator = require('../validations/donations')

router.post('/',
  donationValidator.validatePOSTDonations,
  rateLimiter.donationInsertionLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  donationController.handlePOSTDonations
)

router.delete('/',
  donationValidator.validateDELETEDonations,
  rateLimiter.deleteDonationLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  donationController.handleDELETEDonations
)

export default router
