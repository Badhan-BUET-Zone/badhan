const moment = require('moment');

const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');


/**
 * This function handles the insertion of a new donor into the database.
 *
 * The request body is expected to contain all donor attributes (excepted protected ones) for a donor document.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTInsertDonor = async (req, res) => {
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        if (authenticatedUser.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to add donors'
            });
        }
        console.log("passed auth");

        let donorObject = {
            phone: req.body.phone,
            bloodGroup: req.body.bloodGroup,
            hall: req.body.hall,
            name: req.body.name,
            studentId: req.body.studentId,
            address: req.body.address,
            roomNumber: req.body.roomNumber,
            lastDonation: req.body.lastDonation,
            comment: req.body.comment
        };

        let donorInsertionResult = await donorInterface.insertDonor(donorObject);

        if (donorInsertionResult.status === 'OK') {
            // console.log("donor insertion complete");

            if (donorObject.lastDonation !== 0) {
                // Insert Donation Here
                let donationObject = {
                    phone: donorObject.phone,
                    date: donorObject.lastDonation
                }

                let donationInsertionResult = await donationInterface.insertDonation(donationObject);

                if (donationInsertionResult.status !== 'OK') {
                    let donorQueryResult = await donorInterface.findDonorByQuery({phone: req.body.donorObject.phone}, {});
                    let insertedDonor = donorQueryResult.data;
                    await donorInterface.deleteDonor(insertedDonor._id);

                    return res.status(400).send({
                        status: 'ERROR',
                        message: 'New donor insertion unsuccessful'
                    });

                }
            }

            return res.status(201).send({
                status: 'OK',
                message: 'New donor inserted successfully'
            });
        } else {
            return res.status(400).send({
                status: 'ERROR',
                message: 'New donor insertion unsuccessful'
            });
        }
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

/**
 * This function handles the filtered query of donors from the database.
 *
 * The request body is expected to contain a search filter, that can optionally be empty.
 * An empty search filter would return all donor documents in the database.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTSearchDonors = async (req, res) => {
    try {
        let reqBody = req.body;

        let searchFilter = {
            bloodGroup: reqBody.bloodGroup,
            hall: reqBody.hall,
        };

        if (reqBody.bloodGroup === -1) {
            delete searchFilter.bloodGroup;
        }

        if (reqBody.hall === -1) {
            delete searchFilter.hall;
        }

        let donorsQueryResult = await donorInterface.findDonorsByQuery(searchFilter, {password: 0});

        if (donorsQueryResult.status === 'OK') {
            let donors = donorsQueryResult.data;

            if (reqBody.isAvailable) {
                let threshold = moment().subtract(120, 'days').valueOf();
                donors = donors.filter((donor) => donor.lastDonation <= threshold);
            }

            if (reqBody.batch !== '') {
                donors = donors.filter((donor) => donor.studentId.startsWith(reqBody.batch));
            }

            if (reqBody.name !== '') {
                donors = donors.filter((donor) => {
                    let j = 0;
                    for (let i = 0; i < donor.name.length; i++) {
                        if (reqBody.name[j] === donor.name[i] || reqBody.name[j].toUpperCase() === donor.name[i]) {
                            j++;
                        }
                        if (j >= reqBody.name.length) {
                            break;
                        }
                    }
                    return j >= reqBody.name.length;

                });
            }

            if (reqBody.address !== '') {

                donors = donors.filter(donor => {
                    if (donor.address === undefined || donor.address === null) return false;
                    // console.log("Donor address = " + donor.address);
                    // console.log("Query address = " + reqBody.address);
                    return donor.address.toLowerCase().includes(reqBody.address.toLowerCase());
                })
            }

            const filteredDonors = [];

            for (let i = 0; i < donors.length; i++) {
                let obj = {
                    phone: donors[i].phone,
                    name: donors[i].name,
                    studentId: donors[i].studentId,
                    lastDonation: donors[i].lastDonation,
                    bloodGroup: donors[i].bloodGroup,
                    address: donors[i].address,
                    donationCount: donors[i].donationCount,
                    roomNumber: donors[i].roomNumber,
                    comment: donors[i].comment
                };

                filteredDonors.push(obj);
            }

            return res.status(200).send({
                status: 'OK',
                message: 'Donors queried successfully',
                filteredDonors
            });
        } else {
            return res.status(400).send({
                status: 'ERROR',
                message: 'Donor query unsuccessful'
            });
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

/**
 * This function adds a comment to a donor's profile.
 *
 * The request body is expected to contain:
 *
 * &emsp; donorPhone -> The phone number for the target donor
 *
 * &emsp; comment -> The comment to be added
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTComment = async (req, res) => {
    try {
        const donorUpdateResult = await donorInterface.findDonorAndUpdate({
            phone: req.body.donorPhone
        }, {
            $set: {
                comment: req.body.comment
            }
        });

        if (donorUpdateResult.status === 'OK') {
            return res.status(200).send({
                status: 'OK',
                message: 'Comment posted successfully'
            });
        } else {
            return res.status(400).send({
                status: donorUpdateResult.status,
                message: donorUpdateResult.message
            });
        }
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the changing of password for an account.
 *
 * The request body is expected to contain:
 *
 * &emsp; donorPhone -> The phone number for the target donor
 *
 * &emsp; newPassword -> The new password that is to be set
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTChangePassword = async (req, res) => {
    try {
        let reqBody = req.body;

        let authenticatedUser = res.locals.middlewareResponse.donor;

        if (authenticatedUser.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to change password'
            });
        }

        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: reqBody.donorPhone
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let target = donorQueryResult.data;

        if (target.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to change password for this donor'
            });
        }

        if (authenticatedUser.designation < target.designation || (authenticatedUser.designation === target.designation && authenticatedUser.phone !== target.phone)) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to change password for this donor'
            });
        }

        target.password = reqBody.newPassword;

        await target.save();

        return res.status(200).send({
            status: 'OK',
            message: 'Password changed successfully'
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the update of donor information.
 *
 * The request body is expected to contain:
 *
 * &emsp; oldPhone -> The old phone number of the donor, used to query the document from the database
 *
 * &emsp; 'new' prefixed donor attribute -> One or many of the donor schema attributes
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTEditDonor = async (req, res) => {
    try {
        let reqBody = req.body;

        let authenticatedUser = res.locals.middlewareResponse.donor;

        if (authenticatedUser.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to edit'
            });
        }

        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: reqBody.oldPhone
        })

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let target = donorQueryResult.data;

        if (authenticatedUser.designation < target.designation ||
            (authenticatedUser.designation === target.designation
                && authenticatedUser.phone !== target.phone)) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to edit this donor'
            });
        }

        let updates = {};

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

        let donorUpdateResult = await donorInterface.findDonorAndUpdate({
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
        });

        if (donorUpdateResult.status !== 'OK') {
            return res.status(400).send({
                status: donorUpdateResult.status,
                message: donorUpdateResult.message
            });
        }
        return res.status(200).send({
            status: 'OK',
            message: 'Donor updated successfully'
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the promotion or demotion of users.
 *
 * The request body is expected to contain:
 *
 * &emsp; donorPhone -> The phone number of the target user
 *
 * &emsp; promoteFlag -> A boolean indicating either promotion or demotion
 *
 * &emsp; newPassword -> Present when promoteFlag is true, i.e. when promoting a general user to one with access credentials
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTPromote = async (req, res) => {
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: req.body.donorPhone
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;
        let donorDesignation = donor.designation;

        let authenticatedUser = res.locals.middlewareResponse.donor;
        let userDesignation = authenticatedUser.designation;

        if (!((donorDesignation === 0 || donorDesignation === 1) && (userDesignation === 2 || userDesignation === 3))) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User can not promote the target entity'
            });
        }
        if ((donorDesignation === 1 && req.body.promoteFlag) || (donorDesignation === 0 && !req.body.promoteFlag)) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Can\'t promote volunteer or can\'t demote donor'
            });
        }
        if (userDesignation === 2) {
            if (authenticatedUser.hall !== donor.hall) {
                return res.status(401).send({
                    status: 'ERROR',
                    message: 'Hall admin can\'t promote donors or demote volunteers of different halls'
                });
            }
        }

        let newDesignation;

        if (req.body.promoteFlag) {
            newDesignation = donorDesignation + 1;
        } else {
            newDesignation = donorDesignation - 1;
        }

        donor.designation = newDesignation;
        if (req.body.promoteFlag) {
            donor.password = req.body.newPassword;
        } else {
            donor.password = null;
        }
        await donor.save();

        return res.status(200).send({
            status: 'OK',
            message: 'Target user promoted/demoted successfully'
        });

    } catch (e) {
        res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the fetching of volunteer lists for a hall admin.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTViewVolunteers = async (req, res) => {
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;
        let userDesignation = authenticatedUser.designation;

        let userHall = authenticatedUser.hall;
        if (userDesignation < 2) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to view volunteer list'
            });
        }

        let donorsQueryResult = await donorInterface.findDonorsByQuery({
            hall: userHall,
            designation: 1
        }, {
            _id: 0,
            studentId: 1,
            name: 1,
            roomNumber: 1,
            bloodGroup: 1,
            phone: 1,

        });

        if (donorsQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorsQueryResult.status,
                message: donorsQueryResult.message
            });
        }

        let volunteerList = donorsQueryResult.data;

        return res.status(200).send({
            status: 'OK',
            message: 'Volunteer list fetched successfully',
            volunteerList
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the changing of a hall admin.
 *
 * The request body is expected to contain:
 * &emsp; donorPhone -> THe phone number of the user who is to be promoted to hall admin
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTChangeAdmin = async (req, res) => {
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;
        let userDesignation = authenticatedUser.designation;

        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: req.body.donorPhone
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;
        let donorDesignation = donor.designation;

        if (userDesignation !== 3 || donorDesignation !== 1) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to change hall admins'
            });
        }

        // Make previous hall admin volunteer

        let donorHall = donor.hall;
        let prevHallAdminQueryResult = await donorInterface.findDonorByQuery({ hall: donorHall, designation: 2 });

        if (prevHallAdminQueryResult.status === 'OK') {
            let prevHallAdminUpdateResult = await donorInterface.findDonorAndUpdate({
                hall: donorHall,
                designation: 2
            }, {
                $set: {
                    designation: 1,
                }
            });

            if (prevHallAdminUpdateResult.status !== 'OK') {
                return res.status(400).send({
                    status: prevHallAdminUpdateResult,
                    message: 'Could not change hall admin'
                });
            }
        }

        // Make new hall admin
        let newHallAdminUpdateResult = await donorInterface.findDonorAndUpdate({
            phone: req.body.donorPhone
        }, {
            $set: {
                designation: 2,
            }
        });

        if (newHallAdminUpdateResult.status !== 'OK') {
            return res.status(400).send({
                status: 'ERROR',
                message: 'Demoted previous hall admin, but could not set new hall admin'
            });
        }

        return res.status(200).send({
            status: 'OK',
            message: 'Successfully changed hall admin'
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


/**
 * This function handles the fetching of hall admin list for a super admin.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTShowHallAdmins = async (req, res) => {
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        if (authenticatedUser.designation !== 3) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to view hall admins'
            });
        }

        let adminsQueryResult = await donorInterface.findDonorsByQuery({ designation: 2 }, {});

        if (adminsQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: adminsQueryResult.status,
                message: adminsQueryResult.message
            });
        }

        let admins = adminsQueryResult.data;

        const filteredAdmins = [];

        for (let i = 0; i < admins.length; i++) {
            let obj = {
                phone: admins[i].phone,
                hall: admins[i].hall,
                name: admins[i].name
            };
            filteredAdmins.push(obj);
        }

        return res.status(200).send({
            status: 'OK',
            message: 'Hall admin list fetched successfully',
            filteredAdmins
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }

}


/**
 * This function handles the fetching of donor details.
 *
 * The request body is expected to contain:
 *
 * &espm; donorPhone -> The phone number for the target donor
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTViewDonorDetails = async (req, res) => {
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: req.body.donorPhone
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let obj = {
            phone: donor.phone,
            name: donor.name,
            studentId: donor.studentId,
            lastDonation: donor.lastDonation,
            bloodGroup: donor.bloodGroup,
            hall: donor.hall,
            roomNumber: donor.roomNumber,
            address: donor.address,
            comment: donor.comment,
            designation: donor.designation
        }

        return res.status(200).send({
            status: 'OK',
            message: 'Successfully fetched donor details',
            donor: obj
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


const handlePOSTAdminSignup = async (req, res) => {
    try {
        let token = req.header('x-auth');
        if (token !== 'lekhaporaputkirmoddhebhoiradimu') {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Invalid secret for signup'
            });
        }
        console.log(req.body.donorObject);

        let donorInsertionResult = await donorInterface.insertDonor(req.body.donorObject);

        if (donorInsertionResult.status !== 'OK') {
            return res.status(400).send({
                status: donorInsertionResult.status,
                message: donorInsertionResult.message
            });
        }

        return res.status(201).send({
            status: 'OK',
            message: 'Signed up successfully'
        });

    } catch (e) {

    }
}

module.exports = {
    handlePOSTInsertDonor,
    handlePOSTSearchDonors,
    handlePOSTComment,
    handlePOSTChangePassword,
    handlePOSTEditDonor,
    handlePOSTPromote,
    handlePOSTViewVolunteers,
    handlePOSTChangeAdmin,
    handlePOSTShowHallAdmins,
    handlePOSTViewDonorDetails,
    handlePOSTAdminSignup
}