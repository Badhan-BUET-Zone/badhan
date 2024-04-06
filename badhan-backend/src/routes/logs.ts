import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import logController from '../controllers/logController'
import { deprecatedController } from '../controllers/otherControllers'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import donationValidator from '../validations/donations'

const router: AsyncRouterInstance = AsyncRouter()

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
router.get('/log/donations',
  rateLimiter.commonLimiter,
  logController.handleGETLogsDonations
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
