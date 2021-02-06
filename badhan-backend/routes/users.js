require('./../config/config');

const express = require('express');
const router = express.Router();


const { mongoose } = require('./../db/mongoose');
const { Donor } = require('./../db/models/Donor');
const { Donation } = require('./../db/models/Donation');

const donorController = require('../controllers/donorController');
const donationController = require('../controllers/donationController');
const authenticator = require('../middlewares/authenticate');

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.send('respond with a resource');
});


router.post('/signin',
    authenticator.handlePOSTLogIn
);

// signin api

// router.post('/signin', async(req, res) => {
//     try {
//       const user = await Donor.findByCredentials(req.body.phone, req.body.password);
//
//       if (user.designation === 0) {
//         throw new Error('User is not permitted to sign in');
//       }
//
//       const token = await user.generateAuthToken();
//
//       res.send({
//         token,
//         designation: user.designation,
//         hall: user.hall
//       });
//
//     } catch (e) {
//         res.status(400).send({
//             success: false,
//             message: e.toString()
//         });
//     }
// });


module.exports = router;
