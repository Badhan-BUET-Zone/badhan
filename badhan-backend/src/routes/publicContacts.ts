// @ts-nocheck
// tslint:disable
import { AsyncRouter } from 'express-async-router'
const router = AsyncRouter()

import publicContactController from '../controllers/publicContactController'
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
import publicContactValidator from '../validations/publicContacts'

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
