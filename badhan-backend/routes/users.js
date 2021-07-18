
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
    authenticator.handlePOSTSignIn
);

router.delete('/signout',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleDELETESignOut
);

router.delete('/signout/all',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleDELETESignOutAll
);


router.post('/redirection',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handlePOSTRedirection
);

router.patch('/redirection',
    rateLimiter.redirectionSignInLimiter,
    authenticator.handlePATCHRedirectedAuthentication
);

module.exports = router;
