require('./../config/config');

var express = require('express');
var router = express.Router();

const moment = require('moment');
const { mongoose } = require('./../db/mongoose');
const { Donor } = require('./../db/models/Donor');
const { Donation } = require('./../db/models/Donation');


/* GET home page. */
router.post('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

//DONE
router.post('/insert', async(req, res) => {
    try {
        var reqBody = req.body;
        var user = await Donor.findOne({ phone: reqBody.userPhone });
        var authenticatedUser = await user.authenticate(reqBody.token);

        if (authenticatedUser.designation === 0) {
          throw new Error('User does not have permission to create new donors');
        }

        var donorAttributes = {
            phone: reqBody.phone,
            bloodGroup: reqBody.bloodGroup,
            hall: reqBody.hall,
            name: reqBody.name,
            studentId: reqBody.studentId,
            address: reqBody.address,
            roomNumber: reqBody.roomNumber,
            lastDonation: reqBody.lastDonation,
            comment: reqBody.comment
        };



        var donor = new Donor(donorAttributes);
        var newDonor = await donor.save();

        if (reqBody.lastDonation !== 0) {
          var donation = new Donation({
            phone: reqBody.phone,
            date: reqBody.lastDonation
          });
          var newDonation = await donation.save();
        }

        res.send({})
    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }

});

//DONE
router.post('/search', async(req, res) => {

    try {
        var reqBody = req.body;

        console.log(req.body);

        var user = await Donor.findOne({ phone: reqBody.userPhone });

        var authenticatedUser = await user.authenticate(reqBody.token);

        var searchFilter = {
            bloodGroup: reqBody.bloodGroup,
            hall: reqBody.hall,
        };

        if (reqBody.bloodGroup === -1) {
            delete searchFilter.bloodGroup;
        }

        if (reqBody.hall === -1) {
            delete searchFilter.hall;
        }

        var donors = await Donor.find(searchFilter);

        console.log('donors number', donors.length);

        if (reqBody.availability) {
            var threshold = moment().subtract(120, 'days').valueOf();
            donors = donors.filter((donor) => donor.lastDonation <= threshold);
        }

        console.log('donors number', donors.length);

        if (reqBody.batch !== '') {
            donors = donors.filter((donor) => donor.studentId.startsWith(reqBody.batch));
        }
        console.log('donors number', donors.length);


        if (reqBody.name !== '') {
            donors = donors.filter((donor) => {
                var j = 0;
                for (var i = 0; i < donor.name.length; i++) {
                    if (reqBody.name[j] === donor.name[i] || reqBody.name[j].toUpperCase() === donor.name[i]) {
                      j++;
                    }
                    if (j >= reqBody.name.length) {
                      break;
                    }
                }
                if (j < reqBody.name.length) {
                  return false;
                }
                return true;
            });
        }

        const filteredDonors = [];

        for (var i = 0; i < donors.length; i++) {
            var obj = {
                phone: donors[i].phone,
                name: donors[i].name,
                studentId: donors[i].studentId,
                lastDonation: donors[i].lastDonation,
                bloodGroup: donors[i].bloodGroup
            };

            filteredDonors.push(obj);
        }

        res.send(filteredDonors);

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});


//seeHistory
//DONE
router.post('/seeHistory', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);
        const donor = await Donor.findOne({ phone: req.body.donorPhone });
        if (!donor) {
            throw new Error('Donor not found');
        }
        const donationDates = await Donation.find({ phone: req.body.donorPhone });

        var donations = [];

        donationDates.forEach(donation => {
            donations.push(donation.date);
        })
        donations.sort(function(a, b) { return b - a });
        res.send(donations);

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }

});

//donate
//DONE
router.post('/donate', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);

        const donor = await Donor.findOne({ phone: req.body.donorPhone });
        if (!donor) {
            throw new Error('Donor not found');
        }

        if (authenticatedUser.designation === 0) {
            throw new Error('User is not permitted to add donation.');
        }

        var newDonationCount = donor.donationCount + 1;
        if (donor.donationCount === 0 || (donor.donationCount !== 0 && req.body.date > donor.lastDonation)) {
            const result = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    lastDonation: req.body.date,
                    donationCount: newDonationCount
                }
            }, {
                returnOriginal: false
            })
        } else if (donor.donationCount !== 0 && req.body.date <= donor.lastDonation) {
            const result = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    donationCount: newDonationCount
                }
            }, {
                returnOriginal: false
            })
        }

        var newDonation = new Donation({
            phone: req.body.donorPhone,
            date: req.body.date
        });

        const doc = await newDonation.save();

        res.send({
            success: true,
            message: "Donation saved"
        });

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }

});

//comment
//DONE
router.post('/comment', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);
        const donor = await Donor.findOne({ phone: req.body.donorPhone });

        if (!donor) {
            throw new Error('Donor not found');
        }

        const result = await Donor.findOneAndUpdate({
            phone: req.body.donorPhone
        }, {
            $set: {
                comment: req.body.comment
            }
        }, {
            returnOriginal: false
        })

        res.send({
            success: true,
            message: "Comment posted"
        });

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});

//deleteDonation
//DONE
router.post('/deleteDonation', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);
        const donor = await Donor.findOne({ phone: req.body.donorPhone });

        if (!donor) {
            throw new Error('Donor not found');
        }

        const donationDates = await Donation.find({ phone: req.body.donorPhone });

        if (donationDates.length === 0) {
            throw new Error('No donations found to delete');
        }

        var donations = [];

        donationDates.forEach(donation => {
            donations.push(donation.date);
        })

        donations.sort(function(a, b) { return a - b });

        var givenDate = req.body.date;
        var isValidDate = donations.includes(givenDate);

        if (!isValidDate) {
            throw new Error('Did not donate blood on this date before');
        }

        var prevLastDonation = donor.lastDonation;
        var newLastDonation = donations[donationDates.length - 1];
        var totalDonations = donor.donationCount;

        for (var i = 0; i < donations.length; i++) {
            if (donations[i] === givenDate) {
                if (i === donations.length - 1) {
                    if (donations.length > 1) {
                        newLastDonation = donations[donations.length - 2];
                    } else {
                        newLastDonation = 0;
                    }
                }
            }
        }

        const result = await Donation.findOneAndDelete({ phone: req.body.donorPhone, date: req.body.date });

        if (prevLastDonation === newLastDonation) {
            const updateRecord = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    donationCount: totalDonations - 1
                }
            }, {
                returnOriginal: false
            });
        } else {
            const updateRecord = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    lastDonation: newLastDonation,
                    donationCount: totalDonations - 1
                }
            }, {
                returnOriginal: false
            });
        }

        res.send({
            success: true,
            message: 'Deleted'
        })
    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});


//DONE
router.post('/changePassword', async(req, res) => {

    try {
        var reqBody = req.body;

        var user = await Donor.findOne({ phone: reqBody.userPhone });

        var authenticatedUser = await user.authenticate(reqBody.token);

        if (authenticatedUser.designation === 0) {
            throw new Error('User does not have permission to change password.');
        }

        var target = await Donor.findOne({ phone: reqBody.donorPhone });

        if (target.designation === 0) {
            throw new Error('User does not have permission to change password for this donor.');
        }

        if (authenticatedUser.designation < target.designation || (authenticatedUser.designation === target.designation && authenticatedUser.phone !== target.phone)) {
            throw new Error('User does not have permission to change password for the target donor.');
        }

        var result = await Donor.findOneAndUpdate({
            phone: reqBody.donorPhone
        }, {
            $set: {
                password: reqBody.newPassword
            }
        }, {
            returnOriginal: false
        });
        res.send({});
    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});

//Done
router.post('/edit', async(req, res) => {

    try {
        var reqBody = req.body;

        var user = await Donor.findOne({ phone: reqBody.userPhone });

        var authenticatedUser = await user.authenticate(reqBody.token);

        if (authenticatedUser.designation === 0) {
            throw new Error('User does not have permission to edit.');
        }

        var target = await Donor.findOne({
            phone: reqBody.oldPhone
        });

        if (authenticatedUser.designation < target.designation ||
          (authenticatedUser.designation === target.designation
            && authenticatedUser.phone !== target.phone)) {
            throw new Error('User does not have permission to edit this donor.');
        }

        var updates = {};

        if (reqBody.newName !== '') {
            updates.name = reqBody.newName;
        } else {
            updates.name = target.name;
        }

        if (reqBody.newPhone !== -1) {
            updates.phone = reqBody.newPhone;
        } else {
            updates.phone = target.phone;
        }

        if (reqBody.newStudentId !== '') {
            updates.studentId = reqBody.newStudentId;
        } else {
            updates.studentId = target.studentId
        }

        if (reqBody.newBloodGroup !== -1) {
            updates.bloodGroup = reqBody.newBloodGroup;
        } else {
            updates.bloodGroup = target.bloodGroup;
        }

        if (reqBody.newHall !== -1) {
            updates.hall = reqBody.newHall;
        } else {
            updates.hall = target.hall;
        }

        if (reqBody.newRoomNumber !== '') {
            updates.roomNumber = reqBody.newRoomNumber;
        } else {
            updates.roomNumber = target.roomNumber;
        }

        if (reqBody.newAddress !== '') {
            updates.address = reqBody.newAddress;
        } else {
            updates.address = target.address;
        }

        var updatedDonor = await Donor.findOneAndUpdate({
            phone: target.phone
        }, {
            $set: {
                phone: updates.phone,
                name: updates.name,
                studentId: updates.studentId,
                bloodGroup: updates.bloodGroup,
                hall: updates.hall,
                roomNumber: updates.roomNumber,
                address: updates.address
            }
        }, {
            returnOriginal: false
        });

        res.send({});

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});

/********Hall admin APIs*********/

//promote
//Done
router.post('/promote', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);

        const donor = await Donor.findOne({ phone: req.body.donorPhone });
        if (!donor) {
            throw new Error('Donor not found');
        }

        var userDesignation = authenticatedUser.designation;
        var donorDesignation = donor.designation;

        if (!((donorDesignation === 0 || donorDesignation === 1) && (userDesignation === 2 || userDesignation === 3))) {
            throw new Error('Not allowed');
        }
        if ((donorDesignation === 1 && req.body.promoteFlag) || (donorDesignation === 0 && !req.body.promoteFlag)) {
            throw new Error('Can\'t promote volunteer or can\'t demote donor.');
        }
        if (userDesignation === 2) {
            if (authenticatedUser.hall !== donor.hall) {
                throw new Error('Hall admin can\'t promote donors or demote volunteers of different halls.');
            }
        }

        var newDesignation;
        if (req.body.promoteFlag) {
            newDesignation = donorDesignation + 1;
        } else {
            newDesignation = donorDesignation - 1;
        }

        if (req.body.promoteFlag) {
            const updateRecord = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    designation: newDesignation,
                    password: req.body.newPassword
                }
            }, {
                returnOriginal: false
            });
        } else {
            const updateRecord = await Donor.findOneAndUpdate({
                phone: req.body.donorPhone
            }, {
                $set: {
                    designation: newDesignation,
                    password: null
                }
            }, {
                returnOriginal: false
            });
        }

        res.send({});
    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }

});


// Hall admin gets volunteers
//Done
router.post('/volunteers', async (req, res) => {
    try {
        const user = await Donor.findOne({phone: req.body.userPhone});
        const authenticatedUser = await user.authenticate(req.body.token);

        let userDesignation = authenticatedUser.designation;
        let userHall = authenticatedUser.hall;

        if (userDesignation !== 2) {
            throw new Error('Not allowed');
        }

        const volunteerList = await Donor.find({
            hall: userHall,
            designation: 1
        });

        res.status(200).send(volunteerList);

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});


//changeAdmin
router.post('/changeAdmin', async(req, res) => {
    try {
        const user = await Donor.findOne({ phone: req.body.userPhone });
        const authenticatedUser = await user.authenticate(req.body.token);

        const donor = await Donor.findOne({ phone: req.body.donorPhone });
        if (!donor) {
            throw new Error('Donor not found');
        }

        var userDesignation = authenticatedUser.designation;
        var donorDesignation = donor.designation;

        if (userDesignation !== 3 || donorDesignation !== 1) {
            throw new Error('Not allowed');
        }
        //make previous hall admin volunteer
        var donorHall = donor.hall;
        const prevHallAdmin = await Donor.findOne({ hall: donorHall, designation: 2 });
        if (prevHallAdmin) {
            const updateRecord = await Donor.findOneAndUpdate({
                hall: donorHall,
                designation: 2
            }, {
                $set: {
                    designation: 1,
                }
            }, {
                returnOriginal: false
            });
        }
        //make new hall admin
        const updateRecord = await Donor.findOneAndUpdate({
            phone: req.body.donorPhone
        }, {
            $set: {
                designation: 2,
            }
        }, {
            returnOriginal: false
        });

        res.send({});



    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }
});


router.post('/showAdmins', async(req, res) => {
    try {
        var reqBody = req.body;
        var user = await Donor.findOne({ phone: reqBody.userPhone });
        var authenticatedUser = await user.authenticate(reqBody.token);

        if (authenticatedUser.designation !== 3) {
            throw new Error('User does not have permission to view hall admins.');
        }

        var admins = await Donor.find({ designation: 2 });

        const filteredAdmins = [];

        for (var i = 0; i < admins.length; i++) {
            var obj = {
                phone: admins[i].phone,
                hall: admins[i].hall,
                name: admins[i].name
            };
            filteredAdmins.push(obj);
        }

        res.send(filteredAdmins);

    } catch (e) {
        res.status(400).send({
            success: false,
            message: e.toString()
        });
    }

});


module.exports = router;
