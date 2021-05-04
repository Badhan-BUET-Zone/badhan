let express = require('express');
let router = express.Router();


const donorController = require('../controllers/donorController2');
const donationController = require('../controllers/donationController2');
const authenticator = require('../middlewares/authenticate');

let gplay = require('google-play-scraper');

/* GET home page. */
router.get('/', function (req, res, next) {
    return res.status(200).send("Badhan API is online")
});

// router.post('/admin/signup',
//     donorController.handlePOSTAdminSignup
// );

router.post('/donor/insert',
    authenticator.handleAuthentication,
    donorController.handlePOSTInsertDonor
);

router.post('/donor/details',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewDonorDetails
);

router.post('/donor/details/self',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewDonorDetailsSelf
);

router.post('/donor/search',
    authenticator.handleAuthentication,
    donorController.handlePOSTSearchDonors
);

router.post('/donor/donations',
    authenticator.handleAuthentication,
    donationController.handleGETSeeHistory
);

router.post('/donation/insert',
    authenticator.handleAuthentication,
    donationController.handlePOSTInsertDonation
);

router.post('/donor/comment',
    authenticator.handleAuthentication,
    donorController.handlePOSTComment
);

router.post('/donation/delete',
    authenticator.handleAuthentication,
    donationController.handlePOSTDeleteDonation
);

router.post('/donor/password/change',
    authenticator.handleAuthentication,
    donorController.handlePOSTChangePassword
);

router.post('/donor/edit',
    authenticator.handleAuthentication,
    donorController.handlePOSTEditDonor
);

router.post('/admin/donor/delete',
    authenticator.handleAuthentication,
    donorController.handlePOSTDeleteDonor
);

/********Hall admin APIs*********/

router.post('/admin/promote',
    authenticator.handleAuthentication,
    donorController.handlePOSTPromote
);

router.post('/admin/volunteers',
    authenticator.handleAuthentication,
    donorController.handlePOSTViewVolunteers
);

router.post('/admin/hall/change',
    authenticator.handleAuthentication,
    donorController.handlePOSTChangeAdmin
);

router.post('/admin/hall/show',
    authenticator.handleAuthentication,
    donorController.handlePOSTShowHallAdmins
);

router.get('/version',(req,res,next)=>{
    /*
    #swagger.description = 'Get app info deployed to play store' */
    gplay.app({appId: 'com.mmmbadhan'})
        .then((response)=>{
            res.status(200).send(response)
        });
});

module.exports = router;
