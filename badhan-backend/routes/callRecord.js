let express = require('express');
let router = express.Router();


const callRecordController = require('../controllers/callRecordController');
const authenticator = require('../middlewares/authenticate');
const rateLimiter = require('../middlewares/rateLimiter');

router.post('/callrecords',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    callRecordController.handlePOSTCallRecord
);


module.exports = router;
