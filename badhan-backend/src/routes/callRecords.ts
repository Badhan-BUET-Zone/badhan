// @ts-nocheck
/* tslint:disable */
const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()

const callRecordController = require('../controllers/callRecordController')
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
const callRecordValidator = require('../validations/callRecords')

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
