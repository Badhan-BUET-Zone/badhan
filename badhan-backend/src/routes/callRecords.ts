// @ts-nocheck
// tslint:disable
import { AsyncRouter } from 'express-async-router'
const router = AsyncRouter()

import callRecordController from '../controllers/callRecordController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import callRecordValidator from '../validations/callRecords'

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
