import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import donationController from '../controllers/donationController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import donationValidator from '../validations/donations'

const router: AsyncRouterInstance = AsyncRouter()

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
