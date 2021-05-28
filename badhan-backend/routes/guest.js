const express = require('express');
const router = express.Router();

const guestController = require('../controllers/guestController')

router.post('/users/signin',
    guestController.handlePOSTLogIn
);

router.post('/users/signout',
    guestController.handlePOSTLogOut
);

router.post('/users/signoutall',
    guestController.handlePOSTLogOutAll
);

router.post('/v2/donor/details/self',
    guestController.handlePOSTViewDonorDetailsSelf
);

router.post('/v2/donor/insert',
    guestController.handlePOSTInsertDonor
);

router.post('/v2/donor/search',
    guestController.handlePOSTSearchDonors
);

router.post('/v2/admin/donor/delete',
    guestController.handlePOSTDeleteDonor,
);

router.post('/v2/donor/comment',
    guestController.handlePOSTComment,
);

router.post('/v2/donor/password/change',
    guestController.handlePOSTChangePassword,
);

router.post('/v2/donor/edit',
    guestController.handlePOSTEditDonor,
);

router.post('/v2/admin/promote',
    guestController.handlePOSTPromote
);

router.post('/v2/admin/hall/change',
    guestController.handlePOSTChangeAdmin
);

router.get('/v3/donor/details',
    guestController.handleGETViewDonorDetails
);

router.post('/v2/admin/volunteers',
    guestController.handlePOSTViewVolunteers
);

router.post('/v2/admin/hall/show',
    guestController.handlePOSTShowHallAdmins
);

router.post('/v2/donor/donations',
    guestController.handleGETSeeHistory
);

router.post('/v2/donation/insert',
    guestController.handlePOSTInsertDonation
);

router.post('/v2/donation/delete',
    guestController.handlePOSTDeleteDonation
);

router.get('/v2/log/statistics',
    guestController.handleGETStatistics
);

router.get('/v1/log',
    guestController.handleGETLogs
);

router.delete('/v1/log',
    guestController.handleDELETELogs
);


module.exports = router;
