import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import callRecordController from '../controllers/callRecordController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import callRecordValidator from '../validations/callRecords'

const router: AsyncRouterInstance = AsyncRouter()

router.post('/',
  callRecordValidator.validatePOSTCallRecords,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  callRecordController.handlePOSTCallRecord
)

router.delete('/',
  callRecordValidator.validateDELETECallRecords,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleHallPermissionOrCheckAvailableToAll,
  callRecordController.handleDELETECallRecord
)

export default router
