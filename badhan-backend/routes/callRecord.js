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

router.get('/callrecords',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    callRecordController.handleGETCallRecords
);

router.delete('/callrecords',
    rateLimiter.commonLimiter,
    authenticator.handleAuthentication,
    authenticator.handleHallPermission,
    callRecordController.handleDELETESingleCallRecord
);

module.exports = router;
