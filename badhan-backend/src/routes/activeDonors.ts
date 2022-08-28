// @ts-nocheck
// tslint:disable
import { AsyncRouter } from 'express-async-router'
const router = AsyncRouter()
import activeDonorController from '../controllers/activeDonorController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import activeDonorsValidator from '../validations/activeDonors'

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
