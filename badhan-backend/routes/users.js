
const express = require('express');
const router = express.Router();

const authenticator = require('../middlewares/authenticate');
const userController = require('../controllers/userController');
const rateLimiter = require('../middlewares/rateLimiter')
const userValidator = require('../validations/users')


router.get('/', (req, res, next)=>{
    return res.send('respond with a resource');
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


module.exports = router;
