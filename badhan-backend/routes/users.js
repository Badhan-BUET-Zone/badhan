const AsyncRouter = require("express-async-router").AsyncRouter;
let router = AsyncRouter();

const authenticator = require('../middlewares/authenticate');
const userController = require('../controllers/userController');
const rateLimiter = require('../middlewares/rateLimiter')
const userValidator = require('../validations/users')
const {deprecatedController} = require('../controllers/otherControllers');

const {OKResponse}= require('../response/successTypes');

router.get('/',(req,res)=>{
    return res.respond(new OKResponse('Backend active'))
});


router.post('/signin', /*#swagger.path = '/users/signin'*/
    userValidator.validateLogin,
    rateLimiter.signInLimiter,
    userController.handlePOSTSignIn
);

router.delete('/signout', /*#swagger.path = '/users/signout'*/
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handleDELETESignOut
);

router.delete('/signout/all', /*#swagger.path = '/users/signout/all'*/
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handleDELETESignOutAll
);


router.post('/redirection', /*#swagger.path = '/users/redirection'*/
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handlePOSTRedirection
);

router.patch('/redirection', /*#swagger.path = '/users/redirection'*/
    rateLimiter.redirectionSignInLimiter,
    userController.handlePATCHRedirectedAuthentication
);

router.post('/password/forgot', /*#swagger.path = '/users/password/forgot'*/
    rateLimiter.passwordForgotLimiter,
    userValidator.validatePOSTPasswordForgot,
    userController.handlePOSTPasswordForgot
);

router.patch('/password',/*#swagger.path = '/users/password'*/
    rateLimiter.commonLimiter,
    userValidator.validatePATCHPassword,
    authenticator.handleAuthentication,
    userController.handlePATCHPassword
);

router.get('/logins',/*#swagger.path = '/users/logins'*/
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handleGETLogins,
)

router.delete('/logins/:tokenId',/*#swagger.path = '/users/logins/{tokenId}'*/
    rateLimiter.commonLimiter,
    userValidator.validateDELETELogins,
    authenticator.handleAuthentication,
    userController.handleDELETELogins,
)

module.exports = router;
