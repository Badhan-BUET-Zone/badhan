const AsyncRouter = require("express-async-router").AsyncRouter;
let router = AsyncRouter();

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
router.patch('/users/password',
    guestController.handlePATCHPassword
);

router.get('/donors/me',
    guestController.handlePOSTViewDonorDetailsSelf
);

router.post('/donors',
    guestController.handlePOSTInsertDonor
);

router.get('/search/v2',
    guestController.handlePOSTSearchDonors
);

router.delete('/donors',
    guestController.handlePOSTDeleteDonor,
);

router.patch('/donors/comment',
    guestController.handlePOSTComment,
);

router.post('/donors/password',
    guestController.handlePOSTChangePassword,
);

router.patch('/donors/v2',
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

router.get('/donors/designation',
    guestController.handleGETDonorsDesignation
);

router.get('/donors/checkDuplicate',
    guestController.handleGETDonorsDuplicate
);

router.get('/volunteers',
    guestController.handlePOSTViewVolunteersOfOwnHall
);

router.get('/admins',
    guestController.handlePOSTShowHallAdmins
);

router.get('/volunteers/all',
    guestController.handleGETViewAllVolunteers,
)

router.post('/donations',
    guestController.handlePOSTInsertDonation
);

router.delete('/donations',
    guestController.handlePOSTDeleteDonation
);

router.get('/log/statistics',
    guestController.handleGETStatistics
);

router.delete('/log',
    guestController.handleDELETELogs
);

router.post('/callrecords',
    guestController.handlePOSTCallRecord
);

router.delete('/callrecords',
    guestController.handleDELETECallRecord
);

router.get('/log/date/:date/donorId/:donorId',
    guestController.handleGETLogsByDateAndDonor
);

router.get('/log/date/:date',
    guestController.handleGETLogsByDate
);

router.get('/log',
    guestController.handleGETLogs
);

router.get('/publicContacts',
    guestController.handleGETPublicContacts
);

router.post('/publicContacts',
    guestController.handlePOSTPublicContact,
);

router.delete('/publicContacts',
    guestController.handleDELETEPublicContact
);

router.get('/users/logins',
    guestController.handleGETLogins,
);

router.delete('/users/logins/:tokenId',
    guestController.handleDELETELogins
);

router.post('/activeDonors',guestController.handlePOSTActiveDonors);
router.delete('/activeDonors/:donorId',guestController.handleDELETEActiveDonors);
router.get('/activeDonors',guestController.handleGETActiveDonors);
module.exports = router;
