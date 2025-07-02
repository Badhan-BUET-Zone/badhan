import {AsyncRouter, AsyncRouterInstance} from 'express-async-router'
import publicContactController from '../controllers/publicContactController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import publicContactValidator from '../validations/publicContacts'
const router: AsyncRouterInstance = AsyncRouter()

router.post('/',
  rateLimiter.publicContactInsertionLimiter,
  publicContactValidator.validatePOSTPublicContact,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleSuperAdminCheck,
  publicContactController.handlePOSTPublicContact
)

router.get('/',
  rateLimiter.commonLimiter,
  publicContactController.handleGETPublicContacts
)

router.delete('/',
  rateLimiter.publicContactDeletionLimiter,
  publicContactValidator.validateDELETEPublicContact,
  authenticator.handleAuthentication,
  authenticator.handleFetchTargetDonor,
  authenticator.handleSuperAdminCheck,
  publicContactController.handleDELETEPublicContact
)

export default router
