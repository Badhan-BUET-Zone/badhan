import { AsyncRouter } from 'express-async-router'
const router = AsyncRouter()

import logController from '../controllers/logController'
import { deprecatedController } from '../controllers/otherControllers'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import logValidator from '../validations/logs'

router.get('/v3/log/version',
  rateLimiter.commonLimiter,
  deprecatedController
)

router.get('/log/version/v4',
  rateLimiter.commonLimiter,
  deprecatedController
)

router.get('/log/version/v5',
  rateLimiter.commonLimiter,
  logController.handleGETAppVersions
)

router.get('/log/statistics',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETStatistics
)

router.get('/log/date/:date/donorId/:donorId',
  logValidator.validateGETLogsByDateAndDonor,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETLogsByDateAndDonor
)

router.get('/log/date/:date',
  logValidator.validateGETLogsByDate,
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETLogsByDate
)

router.get('/log',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleGETLogs
)

router.delete('/log',
  rateLimiter.commonLimiter,
  authenticator.handleAuthentication,
  authenticator.handleSuperAdminCheck,
  logController.handleDELETELogs
)

export default router
