
const express = require('express');
const router = express.Router();

const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter')

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});

router.post('/signin',
    rateLimiter.signInLimiter,
    authenticator.handlePOSTLogIn
);

//THIS ROUTE HAS BEEN DEPRECATED ON 30 JUNE 2021. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
router.post('/signout',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handlePOSTLogOut
);

router.delete('/signout',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleDeleteSignOut
);

router.post('/signoutall',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handlePOSTLogOutAll
);

router.post('/requestRedirection',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handlePOSTRequestRedirection
);

router.post('/redirectionSignIn',
    rateLimiter.redirectionSignInLimiter,
    authenticator.handlePOSTRedirectedAuthentication
);

module.exports = router;
