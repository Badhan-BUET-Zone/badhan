
const express = require('express');
const router = express.Router();

const authenticator = require('../middlewares/authenticate');
const userController = require('../controllers/userController');
const rateLimiter = require('../middlewares/rateLimiter')

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

router.post('/signin',
    rateLimiter.signInLimiter,
    userController.handlePOSTSignIn
);

router.delete('/signout',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handleDELETESignOut
);

router.delete('/signout/all',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handleDELETESignOutAll
);


router.post('/redirection',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    userController.handlePOSTRedirection
);

router.patch('/redirection',
    rateLimiter.redirectionSignInLimiter,
    userController.handlePATCHRedirectedAuthentication
);


module.exports = router;
