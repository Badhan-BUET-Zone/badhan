const express = require('express');
const router = express.Router();

const guestController = require('../controllers/guestController')

router.post('/users/signin',
    guestController.handlePOSTLogIn
);

router.delete('/users/signout',
    guestController.handlePOSTLogOut
);

router.delete('/users/signout/all',
    guestController.handlePOSTLogOutAll
);

router.get('/donors/me',
    guestController.handlePOSTViewDonorDetailsSelf
);

router.post('/donors',
    guestController.handlePOSTInsertDonor
);

router.get('/search',
    guestController.handlePOSTSearchDonors
);

router.delete('/donors',
    guestController.handlePOSTDeleteDonor,
);

router.patch('/donors/comment',
    guestController.handlePOSTComment,
);

router.patch('/donors/password',
    guestController.handlePOSTChangePassword,
);

router.patch('/donors',
    guestController.handlePOSTEditDonor,
);

router.patch('/donors/designation',
    guestController.handlePOSTPromote
);

router.patch('/admins',
    guestController.handlePOSTChangeAdmin
);

router.get('/donors',
    guestController.handleGETViewDonorDetails
);

router.get('/volunteers',
    guestController.handlePOSTViewVolunteersOfOwnHall
);

router.get('/admins',
    guestController.handlePOSTShowHallAdmins
);

router.get('/donations',
    guestController.handleGETSeeHistory
);

router.post('/donations',
    guestController.handlePOSTInsertDonation
);

router.delete('/donations',
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

router.get('/volunteers/all',
    guestController.handleGETViewAllVolunteers,
)



module.exports = router;
