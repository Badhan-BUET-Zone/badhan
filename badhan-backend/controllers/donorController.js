const moment = require('moment');

const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');


/** DONE
 * This function handles the insertion of a new donor into the database.
 *
 * The request body is expected to contain all donor attributes (excepted protected ones) for a donor document.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTInsertDonor = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the insertion of a new donor into the database.' */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        if (authenticatedUser.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to add donors'
            });
        }

        let duplicateDonorResult = await donorInterface.findDonorsByPhone(req.body.phone);
        if (duplicateDonorResult.donors.length !== 0) {
            return res.status(409).send({
                status: 'ERROR',
                message: 'Donor(s) found with duplicate phone number',
                donors: duplicateDonorResult.donors
            });
        }

        let donorObject = {
            phone: req.body.phone,
            bloodGroup: req.body.bloodGroup,
            hall: req.body.hall,
            name: req.body.name,
            studentId: req.body.studentId,
            address: req.body.address,
            roomNumber: req.body.roomNumber,
            lastDonation: req.body.lastDonation,
            comment: req.body.comment,
            donationCount: req.body.extraDonationCount,
        };

        let donorInsertionResult = await donorInterface.insertDonor(donorObject);
        if (donorInsertionResult.status !== 'OK') {
            return res.status(400).send({
                status: 'ERROR',
                message: 'New donor insertion unsuccessful'
            });
        }

        console.log(donorInsertionResult.data)
        for(let i = 0 ; i < req.body.extraDonationCount; i++){
            await donationInterface.insertDonation({
                phone: donorInsertionResult.data.phone,
                donorId: donorInsertionResult.data._id,
                date: 0
            });
        }

        await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "CREATE DONOR", donorInsertionResult.data);

        return res.status(201).send({
            status: 'OK',
            message: 'New donor inserted successfully',
            newDonor: donorInsertionResult.data
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

/** DONE
 * This function handles the deletion of an existing donor from the database.
 *
 * The request body is expected to contain the phone number of the donor to be deleted.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTDeleteSelf = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the deletion of an existing donor from the database.' */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        let deleteDonationsResult = await donationInterface.deleteDonationsByQuery({
            donorId: authenticatedUser._id
        });

        if (deleteDonationsResult.status === 'OK') {
            let deleteDonorResult = await donorInterface.deleteDonorById(authenticatedUser._id);

            if (deleteDonorResult.status === 'OK') {
                return res.status(200).send({
                    status: 'OK',
                    message: 'Donor deleted successfully'
                });
            }
        }

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

/** DONE
 * This function handles the deletion of an existing donor from the database.
 *
 * The request body is expected to contain the phone number of the donor to be deleted.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTDeleteDonor = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the deletion of an existing donor from the database.' */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;
        let donorId = req.body.donorId;

        if (authenticatedUser.designation !== 3) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to delete donors'
            });
        }

        let deleteDonationsResult = await donationInterface.deleteDonationsByQuery({
            donorId
        });

        if (deleteDonationsResult.status === 'OK') {
            let deleteDonorResult = await donorInterface.deleteDonorById(donorId);

            if (deleteDonorResult.status === 'OK') {
                await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "DELETE DONOR", deleteDonorResult.data);

                return res.status(200).send({
                    status: 'OK',
                    message: 'Donor deleted successfully'
                });
            }
        }

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

/** DONE
 * This function handles the filtered query of donors from the database.
 *
 * The request body is expected to contain a search filter, that can optionally be empty.
 * An empty search filter would return all donor documents in the database.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTSearchDonors = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the filtered query of donors from the database.' */
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

            // if (reqBody.isAvailable) {
            //     let threshold = moment().subtract(120, 'days').valueOf();
            //     donors = donors.filter((donor) => donor.lastDonation <= threshold);
            // }

            if (!reqBody.isAvailable) {
                let threshold = moment().subtract(120, 'days').valueOf();
                donors = donors.filter((donor) => donor.lastDonation >= threshold);
            }

            if (!reqBody.isNotAvailable) {
                let threshold = moment().subtract(120, 'days').valueOf();
                donors = donors.filter((donor) => donor.lastDonation < threshold);
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
                    _id: donors[i]._id,
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

/** DONE
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
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'adds a comment to a donor's profile.' */
    try {
        const donorUpdateResult = await donorInterface.findDonorAndUpdate({
            _id: req.body.donorId
        }, {
            $set: {
                comment: req.body.comment
            }
        });

        if (donorUpdateResult.status === 'OK') {
            await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "UPDATE COMMENT", donorUpdateResult.data);

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


/** DONE
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
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the changing of password for an account.' */
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
            _id: reqBody.donorId
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
        await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "UPDATE PASSWORD", donorQueryResult.data);
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


/** DONE
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
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the update of donor information.' */
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
            _id: reqBody.donorId
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
                && !authenticatedUser._id.equals(target._id))) {
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

        if (reqBody.newRoomNumber !== undefined && reqBody.newRoomNumber !== null) {
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
        await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "UPDATE DONOR", donorUpdateResult.data);

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


/** DONE
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
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the promotion or demotion of users.' */
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
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

        let logOperation = "";
        if (req.body.promoteFlag) {
            logOperation = "PROMOTE DONOR";
        } else {
            logOperation = "DEMOTE DONOR";
        }

        await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, logOperation, donor);


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


/** DONE
 * This function handles the fetching of volunteer lists for a hall admin.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTViewVolunteersOfOwnHall = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the fetching of volunteer lists for a hall admin.' */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;
        let userDesignation = authenticatedUser.designation;

        let userHall = authenticatedUser.hall;

        let donorsQueryResult = await donorInterface.findDonorsByQuery({
            hall: userHall,
            designation: 1
        }, {
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


/** DONE
 * This function handles the changing of a hall admin.
 *
 * The request body is expected to contain:
 * &emsp; donorPhone -> THe phone number of the user who is to be promoted to hall admin
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTChangeAdmin = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the changing of a hall admin.' */
    try {

        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;
        let donorDesignation = donor.designation;

        if (donorDesignation !== 1) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User is not a volunteer'
            });
        }

        // Make previous hall admin volunteer

        let donorHall = donor.hall;
        let prevHallAdminQueryResult = await donorInterface.findDonorByQuery({hall: donorHall, designation: 2});

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

            await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "DEMOTE HALLADMIN", prevHallAdminUpdateResult.data);

        }

        // Make new hall admin
        let newHallAdminUpdateResult = await donorInterface.findDonorAndUpdate({
            _id: req.body.donorId
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
        await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "PROMOTE VOLUNTEER", newHallAdminUpdateResult.data);

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


/** DONE
 * This function handles the fetching of hall admin list for a super admin.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTShowHallAdmins = async (req, res) => {
    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the fetching of hall admin list for a super admin.' */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        let adminsQueryResult = await donorInterface.findDonorsByQuery({designation: 2}, {
            phone: 1,
            hall: 1,
            name: 1
        });

        if (adminsQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: adminsQueryResult.status,
                message: adminsQueryResult.message
            });
        }

        let admins = adminsQueryResult.data;

        return res.status(200).send({
            status: 'OK',
            message: 'Hall admin list fetched successfully',
            admins
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }

}


/** DONE
 * This function handles the fetching of donor details.
 *
 * The request body is expected to contain:
 *
 * &espm; donorPhone -> The phone number for the target donor
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */

const handleGETViewDonorDetails = async (req, res) => {

    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the fetching of donor details.' */
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.query.donorId
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let obj = {
            _id: donor._id,
            phone: donor.phone,
            name: donor.name,
            studentId: donor.studentId,
            lastDonation: donor.lastDonation,
            bloodGroup: donor.bloodGroup,
            hall: donor.hall,
            roomNumber: donor.roomNumber,
            address: donor.address,
            comment: donor.comment,
            designation: donor.designation,
            donationCount: donor.donationCount,
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

//THIS IS A DEPRECATED ROUTE THAT WILL BE REMOVED ON 25 MAY 2022. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
//APP VERSION <= 3.5.1 STILL USES IT
const handlePOSTViewDonorDetails = async (req, res) => {

    /*  #swagger.tags = ['Donors']
            #swagger.description = 'handles the fetching of donor details.' */
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let obj = {
            _id: donor._id,
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


/** DONE
 * This function handles the fetching of own details.
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTViewDonorDetailsSelf = async (req, res) => {
    /*  #swagger.tags = ['Donors']
        #swagger.description = 'handles the fetching of own details.' */
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: res.locals.middlewareResponse.donor._id
        });

        if (donorQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let obj = {
            _id: donor._id,
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
const handleGETViewAllVolunteers = async (req, res) => {

    try {
        let volunteerResult = await donorInterface.findAllVolunteers();

        if (volunteerResult.status !== 'OK') {
            return res.status(400).send({
                status: volunteerResult.status,
                message: volunteerResult.message
            });
        }
        return res.status(200).send({
            status: 'OK',
            message: 'Successfully fetched donor details',
            data: volunteerResult.data
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


module.exports = {
    handlePOSTInsertDonor,
    handlePOSTDeleteSelf,
    handlePOSTDeleteDonor,
    handlePOSTSearchDonors,
    handlePOSTComment,
    handlePOSTChangePassword,
    handlePOSTEditDonor,
    handlePOSTPromote,
    handlePOSTViewVolunteersOfOwnHall,
    handlePOSTChangeAdmin,
    handlePOSTShowHallAdmins,
    handleGETViewDonorDetails,
    handlePOSTViewDonorDetails,//THIS IS A DEPRECATED ROUTE THAT WILL BE REMOVED ON 25 MAY 2022. PLEASE DO NOT EDIT THIS ROUTE ANYMORE.
//APP VERSION <= 3.5.1 STILL USES IT
    handlePOSTViewDonorDetailsSelf,
    handleGETViewAllVolunteers
}
