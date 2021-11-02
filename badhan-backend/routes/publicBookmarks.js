const AsyncRouter = require("express-async-router").AsyncRouter;
let router = AsyncRouter();

const publicBookmarkController = require('../controllers/publicBookmarkController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');
const publicBookmarksValidator = require('../validations/publicBookmarks');

router.post('/', /*#swagger.path = '/bookmarks/public'*/
    publicBookmarksValidator.validatePOSTPublicBookmarks,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    publicBookmarkController.handlePOSTPublicBookmarks,
);

router.delete('/:donorId',/*#swagger.path = '/bookmarks/public/{donorId}'*/
    publicBookmarksValidator.validateDELETEPublicBookmarks,
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleFetchTargetDonor,
    authenticator.handleHallPermissionOrCheckAvailableToAll,
    publicBookmarkController.handleDELETEPublicBookmarks
);

module.exports = router;
