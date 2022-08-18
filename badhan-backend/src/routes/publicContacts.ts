// @ts-nocheck
/* tslint:disable */
const AsyncRouter = require('express-async-router').AsyncRouter
const router = AsyncRouter()

const publicContactController = require('../controllers/publicContactController')
import authenticator from '../middlewares/authenticate'
import rateLimiter from '../middlewares/rateLimiter'
const publicContactValidator = require('../validations/publicContacts')

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
