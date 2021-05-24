
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

router.post('/signout',
    authenticator.handleAuthentication,
    authenticator.handlePOSTLogOut
);

router.post('/signoutall',
    authenticator.handleAuthentication,
    authenticator.handlePOSTLogOutAll
);

module.exports = router;
