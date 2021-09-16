let express = require('express');
let router = express.Router();

const publicContactController = require('../controllers/publicContactController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
const publicContactValidator = require('../validations/publicContacts');

const {deprecatedController} = require('../controllers/otherControllers');

router.post('/', /*#swagger.path = '/publicContacts'*/
    rateLimiter.publicContactInsertionLimiter,
    publicContactValidator.validatePOSTPublicContact,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleSuperAdminCheck,
    publicContactController.handlePOSTPublicContact
);

router.get('/', /*#swagger.path = '/publicContacts'*/
    rateLimiter.commonLimiter,
    publicContactController.handleGETPublicContacts
);

router.delete('/', /*#swagger.path = '/publicContacts'*/
    rateLimiter.publicContactDeletionLimiter,
    publicContactValidator.validateDELETEPublicContact,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleSuperAdminCheck,
    publicContactController.handleDELETEPublicContact
);

module.exports = router;
