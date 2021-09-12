const util = require('util');
const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
const tokenInterface = require('../db/interfaces/tokenInterface');
const emailInterface = require('../db/interfaces/emailInterface');
const {halls} = require('../constants')
const jwt = require('jsonwebtoken');

const handlePOSTDonors = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'handles the insertion of a new donor into the database.'
        #swagger.parameters['insertDonor'] = {
            in: 'body',
            description: 'donor info for inserting donor',
            schema: {
                phone: 8801521438557,
                bloodGroup: 2,
                hall: 5,
                name: 'Mir Mahathir Mohammad',
                studentId: 1605011,
                address: 'Azimpur',
                roomNumber: '3009',
                comment: 'developer of badhan',
                extraDonationCount: 2,
                availableToAll: true
            }
        }

     */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;


        let duplicateDonorResult = await donorInterface.findDonorByPhone(req.body.phone);

        if (duplicateDonorResult.status === 'OK') {
            if (
                authenticatedUser.designation === 3 ||
                duplicateDonorResult.data.hall === authenticatedUser.hall ||
                duplicateDonorResult.data.hall > 6 ||
                duplicateDonorResult.data.availableToAll === true
            ) {
                /*
                #swagger.responses[409] = {
                    schema: {
                        status: 'ERROR',
                        message: 'Donor found with duplicate phone number',
                        donor: 'donor array'
                    },
                    description: 'If the donor already exists in the database, user will get the error message'
                }

                 */
                return res.status(409).send({
                    status: 'ERROR',
                    message: 'Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall",
                    donor: duplicateDonorResult.data,
                });
            }
            /*
            #swagger.responses[401] = {
                schema: {
                    status: 'ERROR',
                    message: 'Donor found with duplicate phone number in another hall',
                    donor: 'this field will return null'
                },
                description: 'If the donor with same phone number already exists in the database with another hall name, user will get the error message'
            }

             */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall. You are not permitted to access this donor.",
                donor: null,
            });
        }

        //if the hall is unknown, then the donor must be available to all
        let availableToAll = req.body.availableToAll
        if (req.body.hall === 8) {
            availableToAll = true;
        }

        let donorObject = {
            phone: req.body.phone,
            bloodGroup: req.body.bloodGroup,
            hall: req.body.hall,
            name: req.body.name,
            studentId: req.body.studentId,
            address: req.body.address,
            roomNumber: req.body.roomNumber,
            lastDonation: 0,
            comment: req.body.comment,
            donationCount: req.body.extraDonationCount,
            availableToAll: availableToAll,
        };

        let donorInsertionResult = await donorInterface.insertDonor(donorObject);
        if (donorInsertionResult.status !== 'OK') {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: 'New donor insertion unsuccessful'
                },
                description: 'If the donor with same phone number already exists in the database with another hall name, user will get the error message'
            }

             */
            return res.status(400).send({
                status: 'ERROR',
                message: 'New donor insertion unsuccessful'
            });
        }

        let dummyDonations = [];
        for (let i = 0; i < req.body.extraDonationCount; i++) {
            dummyDonations.push({
                phone: donorInsertionResult.data.phone,
                donorId: donorInsertionResult.data._id,
                date: 0
            })
        }

        let dummyInsertionResult = await donationInterface.insertManyDonations(dummyDonations);


        if (dummyInsertionResult.status !== "OK") {
            return res.status(500).send({
                status: 'ERROR',
                message: 'Dummy donations insertion unsuccessful'
            });
        }


        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "CREATE DONOR", donorInsertionResult.data);
        /*
                #swagger.responses[201] = {
                    schema: {
                        status: 'OK',
                        message: 'New donor inserted successfully',
                        newDonor: '(new donor data)'
                    },
                    description: 'successful donor insertion'
                }

         */
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

const handleDELETEDonors = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'handles the deletion of an existing donor from the database.
        #swagger.parameters['donorId'] = {
            in: 'query',
            description: 'donor id for deleting donation',
            type: 'string'
        }

     */

    try {
        let donor = res.locals.middlewareResponse.targetDonor;

        if (donor.designation > 1) {
            return res.status(401).send({
                status: 'ERROR',
                message: "Donor must be demoted for deletion"
            })
        }

        let deleteDonorResult = await donorInterface.deleteDonorById(donor._id);
        /*
                #swagger.responses[404] = {
                    schema: {
                        status: 'EXCEPTION',
                        message: 'Error occurred in deleting target donor'
                    },
                    description: 'Error occured when deleting target donor'
                }
         */
        if (deleteDonorResult.status !== 'OK') {
            return res.status(404).send({
                status: 'EXCEPTION',
                message: "Error occurred in deleting target donor"
            })
        }

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "DELETE DONOR", deleteDonorResult.data);
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Donor deleted successfully'
                    },
                    description: 'Successful donor deletion'
                }

         */
        return res.status(200).send({
            status: 'OK',
            message: 'Donor deleted successfully'
        });


    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}


const handleGETSearchOptimized = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Searches for donors that matches the filters'
        #swagger.parameters['bloodGroup'] = {
            description: 'blood group for donors',
            type: 'number',
            name: 'bloodGroup',
            in: 'query'
        }
        #swagger.parameters['hall'] = {
            description: 'hall for donors',
            type: 'number',
            name: 'hall',
            in: 'query'
        }
        #swagger.parameters['batch'] = {
            description: 'batch for donors',
            type: 'number',
            name: 'batch',
            in: 'query'
        }
        #swagger.parameters['name'] = {
            description: 'name for donors',
            type: 'string',
            name: 'name',
            in: 'query'
        }
        #swagger.parameters['name'] = {
            description: 'address for donors',
            type: 'string',
            name: 'address',
            in: 'query'
        }
        #swagger.parameters['isAvailable'] = {
            description: 'isAvailable for donors',
            type: 'boolean',
            name: 'isAvailable',
            in: 'query'
        }
        #swagger.parameters['isNotAvailable'] = {
            description: 'isNotAvailable for donors',
            type: 'boolean',
            name: 'isNotAvailable',
            in: 'query'
        }
        #swagger.parameters['availableToAll'] = {
            description: 'availableToAll denotes the availability of the donor to the other hall members',
            type: 'boolean',
            name: 'availableToAll',
            in: 'query'
        }

     */

    try {
        let reqQuery = req.query;

        // console.log(util.inspect(reqQuery, false, null, true /* enable colors */))

        if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall
            && reqQuery.hall <= 6
            && res.locals.middlewareResponse.donor.designation !== 3) {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: 'You are not allowed to search donors of other halls'
                },
                description: 'This error will occur if the user tries to search other halls'
            }

             */
            return res.status(400).send({
                status: 'ERROR',
                message: 'You are not allowed to search donors of other halls'
            });
        }

        let queryBuilder = {}

        //process blood group
        if (reqQuery.bloodGroup !== -1) {
            queryBuilder.bloodGroup = reqQuery.bloodGroup;
        }

        //process hall
        // if the availableToAll is true, then there is no need to search using hall
        // otherwise, hall must be included
        if (!reqQuery.availableToAll) {
            queryBuilder.hall = reqQuery.hall;
        } else {
            queryBuilder.availableToAll = reqQuery.availableToAll;
        }

        //process batch
        let batchRegex = "......."
        if (reqQuery.batch !== "") {
            batchRegex = reqQuery.batch + ".....";
        }
        queryBuilder.studentId = {$regex: batchRegex, $options: 'ix'};

        //process name
        let nameRegex = ".*";

        for (let i = 0; i < reqQuery.name.length; i++) {
            nameRegex += (reqQuery.name.charAt(i) + ".*");
        }

        queryBuilder.name = {$regex: nameRegex, $options: 'ix'};

        //process address
        let addressRegex = ".*" + reqQuery.address + ".*";

        // for (let i = 0; i < reqQuery.address.length; i++) {
        //     addressRegex += (reqQuery.address.charAt(i) + ".*");
        // }

        queryBuilder.$and = [{
            $or: [
                {comment: {$regex: addressRegex, $options: 'ix'}},
                {address: {$regex: addressRegex, $options: 'ix'}}]
        },
        ];

        let availableLimit = new Date().getTime() - 120 * 24 * 3600 * 1000;

        let lastDonationAvailability = [];

        if (reqQuery.isAvailable) {
            lastDonationAvailability.push({
                lastDonation: {$lt: availableLimit}
            })
        }

        if (reqQuery.isNotAvailable) {
            lastDonationAvailability.push({
                lastDonation: {$gt: availableLimit}
            })
        }

        if (reqQuery.isNotAvailable || reqQuery.isAvailable) {
            queryBuilder.$and.push({$or: lastDonationAvailability});
        }

        // console.log(util.inspect(queryBuilder, false, null, true /* enable colors */))

        let result = await donorInterface.findDonorsByQuery(queryBuilder);

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "SEARCH DONORS", {
            filter: reqQuery,
            resultCount: result.data.length
        })

        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Donor deleted successfully',
                        filteredDonors: [
                            {
                                "address": "Narayangonj Narayangonj ",
                                "roomNumber": "249",
                                "designation": 0,
                                "lastDonation": 1569974400000,
                                "comment": "Has diabetes",
                                "commentTime": 1628521457159,
                                "_id": "5e6776166f73f925e22a0624",
                                "studentId": "1606001",
                                "name": "Swapnil Saha",
                                "bloodGroup": 2,
                                "phone": 88014587556,
                                "hall": 0,
                                "availableToAll": true,
                                "callRecords": [
                                    {
                                        "date": 1628520769727,
                                        "_id": "611141413ac83c0015f851b7",
                                        "callerId": "5e6776166f73f925e22a05aa",
                                        "calleeId": "5e6776166f73f925e22a0624"
                                    }
                                ],
                                "donationCountOptimized": 6,
                            }
                        ]
                    },
                    description: 'Successful donor deletion'
                }
        */

        return res.status(200).send({
            status: 'OK',
            message: 'Donors queried successfully',
            filteredDonors: result.data
        });

    } catch (e) {
        console.log(e);
        res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handlePATCHDonorsComment = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Adds a comment to a donors profile.'
        #swagger.parameters['editDonorComment'] = {
            in: 'body',
            description: 'donor info for posting comment',
            schema: {
                donorId: 'hujfsduif783ujh',
                comment: 'Sample comment about donor'
            }
        }

     */


    try {
        let targetDonor = res.locals.middlewareResponse.targetDonor;

        targetDonor.comment = req.body.comment;
        targetDonor.commentTime = new Date().getTime();
        await targetDonor.save();

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "UPDATE DONOR COMMENT", targetDonor);

        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Comment posted successfully'
                    },
                    description: 'In case of successfully saving the comment'
                }

         */
        return res.status(200).send({
            status: 'OK',
            message: 'Comment posted successfully'
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handlePATCHDonorsPassword = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the changing of password for an account.'
        #swagger.parameters['changePassword'] = {
            in: 'body',
            description: 'donor info for changing password',
            schema: {
                donorId: 'ghjdgejhd7623jhs',
                password: 'thisisanewpassword'
            }
        }

     */
    try {
        let reqBody = req.body;

        let target = res.locals.middlewareResponse.targetDonor;

        if (target.designation === 0) {
            /*
            #swagger.responses[401] = {
                schema: {
                    status: 'ERROR',
                    message: 'Target user does not have an account'
                },
                description: 'Target user does not have an account'
            }

             */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Target user does not have an account'
            });
        }


        target.password = reqBody.password;

        await target.save();

        await tokenInterface.deleteAllTokensByDonorId(target._id);

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "UPDATE DONOR PASSWORD", {name: target.name});

        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Password changed successfully'
            },
            description: 'Successful password change done'
        }

         */
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

const handlePATCHDonors = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the update of donor information.'
        #swagger.parameters['editDonor'] = {
            in: 'body',
            description: 'donor info for editing donor',
            schema: {
                donorId: 'ghjdgejhd7623jhs',
                name: 'Mir Mahathir Mohammad',
                phone: 8801521438557,
                studentId: 1605011,
                bloodGroup: 2,
                hall: 3,
                roomNumber: '3009',
                address: 'Azimpur',
                availableToAll: true,
                email: 'mirmahathir1@gmail.com'
            }
        }

     */

    /*
    #swagger.responses[404] = {
        schema: {
            status: 'ERROR',
            message: 'Email address does not exist'
        },
        description: 'Donor info update successful'
    }

    #swagger.responses[401] = {
        schema: {
            status: 'ERROR',
            message: 'You do not have permission to edit email address of another user'
        },
        description: 'You do not have permission to edit email address of another user'
    }

     */
    try {
        let reqBody = req.body;

        let target = res.locals.middlewareResponse.targetDonor;
        let user = res.locals.middlewareResponse.donor;

        if (reqBody.email !== "" && !await emailInterface.checkIfEmailExists(reqBody.email)) {
            return res.status(404).send({
                status: 'ERROR',
                message: 'Email address does not exist'
            });
        }

        if (target.email !== reqBody.email && !target._id.equals(user._id)) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'You do not have permission to edit email address of another user'
            });
        }

        target.name = reqBody.name;
        target.phone = reqBody.phone;
        target.studentId = reqBody.studentId;
        target.bloodGroup = reqBody.bloodGroup;
        target.hall = reqBody.hall;
        target.roomNumber = reqBody.roomNumber;
        target.address = reqBody.address;
        target.availableToAll = reqBody.availableToAll;
        target.email = reqBody.email;

        if (target.hall === 8) {
            target.availableToAll = true;
        }

        await target.save();

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "UPDATE DONOR", target);
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Donor updated successfully'
                    },
                    description: 'Donor info update successful'
                }

         */
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

const handlePATCHDonorsDesignation = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the promotion or demotion of users.'
        #swagger.parameters['promote'] = {
            in: 'body',
            description: 'If the user wants to promote the target donor, promoteFlag should be true and a new password is needed to be set. If the target donor needs to be demoted, the promoteFlag should be false.',
            schema: {
                donorId: 'hjasgd673278',
                promoteFlag: true,
            }
        }

     */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;
        let donorDesignation = donor.designation;


        if ((donorDesignation === 1 && req.body.promoteFlag)
            || (donorDesignation === 0 && !req.body.promoteFlag)) {
            /*
            #swagger.responses[401] = {
                schema: {
                    status: 'ERROR',
                    message: 'Can not promote volunteer or can not demote donor'
                },
                description: 'If user cannot promote volunteer or cannot demote donor'
            }

             */
            return res.status(401).send({
                status: 'ERROR',
                message: 'Can\'t promote volunteer or can\'t demote donor'
            });
        }

        if (donor.hall > 6) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'Donor does not have a valid hall'
            });
        }

        if (req.body.promoteFlag) {
            donor.designation = 1
        } else {
            donor.designation = 0
        }

        await donor.save();

        let logOperation = "";
        if (req.body.promoteFlag) {
            logOperation = "PROMOTE";
        } else {
            logOperation = "DEMOTE";
        }

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "UPDATE DONOR DESIGNATION (" + logOperation + ")", donor);
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Target user promoted/demoted successfully'
            },
            description: 'Donor promotion/ demotion successful'
        }

         */
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

const handleGETVolunteers = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the fetching of volunteer lists for a hall admin.'

     */
    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

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
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: '(Error message)'
                },
                description: 'The filter parameters are incorrect'
            }

             */
            return res.status(400).send({
                status: donorsQueryResult.status,
                message: donorsQueryResult.message
            });
        }

        let volunteerList = donorsQueryResult.data;
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Volunteer list fetched successfully',
                volunteerList: [
                    {
                        _id: "dskgjhwebkjsdbd",
                        bloodGroup: 2,
                        name: "John Doe",
                        phone: 8801456987445,
                        roomNumber: "409",
                        studentId: 1610000,
                    }
                ]
            },
            description: 'An array of volunteers fetched successfully'
        }

         */
        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "READ VOLUNTEERS", {});

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

const handlePATCHAdmins = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Promotes a volunteer to hall admin and demotes the existing hall admin to volunteer'
        #swagger.parameters['admin'] = {
            in: 'body',
            description: 'donor info for changing admin',
            schema: {
                donorId: 'hdjhd12vhjgj3428569834hth'
            }
        }
     */
    try {
        let targetDonor = res.locals.middlewareResponse.targetDonor;

        if (targetDonor.designation !== 1) {
            /*
            #swagger.responses[401] = {
                schema: {
                    status: 'ERROR',
                    message: 'User is not a volunteer'
                },
                description: 'If fetched user is not a volunteer , user will get this error message'
            }
             */
            return res.status(401).send({
                status: 'ERROR',
                message: 'User is not a volunteer'
            });
        }

        if (targetDonor.hall > 6) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have a valid hall'
            });
        }

        let prevHallAdminUpdateResult = await donorInterface.findDonorAndUpdate({
            hall: targetDonor.hall,
            designation: 2
        }, {
            $set: {designation: 1}
        });

        if (prevHallAdminUpdateResult.status !== 'OK') {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'Error status',
                    message: 'Could not change hall admin'
                },
                description: 'hall admin change unsuccessful'
            }
             */
            return res.status(400).send({
                status: "ERROR",
                message: 'Could not change hall admin'
            });
        }

        // Make new hall admin
        targetDonor.designation = 2;
        await targetDonor.save();

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PROMOTE VOLUNTEER", {name: targetDonor.name});
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Successfully changed hall admin'
                    },
                    description: 'Successfully changed hall admin'
                }

         */
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

const handleGETAdmins = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'handles the fetching of hall admin list for a super admin.'

     */
    try {

        let adminsQueryResult = await donorInterface.findDonorsByQuery({designation: 2}, {
            phone: 1,
            hall: 1,
            name: 1
        });

        if (adminsQueryResult.status !== 'OK') {
            /*
            #swagger.responses[500] = {
                schema: {
                    status: 'ERROR',
                    message: '(Error message)'
                },
                description: 'If user does not exists in database, user will get this error message'
            }

             */
            return res.status(500).send({
                status: adminsQueryResult.status,
                message: adminsQueryResult.message
            });
        }

        let admins = adminsQueryResult.data;
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Hall admin list fetched successfully',
                        admins: [{
                            _id: "reohrewoihgfsdn",
                            hall: 0,
                            name: "Salman Khan",
                            phone: 8801521478996,
                        }]
                    },
                    description: 'Hall admin list fetch successful '
                }

         */
        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "READ ADMINS", {});

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

const handleGETDonors = async (req, res) => {

    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'handles the fetching of donor details.'
        #swagger.parameters['donorId'] = {
            description: 'Donor id for donor details',
            type: 'string',
            name: 'donorId',
            in: 'query'
        }

     */

    try {

        let donor = res.locals.middlewareResponse.targetDonor;
        await donor.populate({
            path: 'donations',
            options: {sort: {'date': -1}}
        }).populate({
            path: 'callRecords',
            populate: {
                path: 'callerId',
                select: {
                    '_id': 1,
                    'name': 1,
                    'hall': 1,
                    'designation': 1
                }
            },
            options: {sort: {'date': -1}}
        }).execPopulate();
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Successfully fetched donor details',
                donor: {
                    _id: 'abjcguiwefvew',
                    phone: 8801521438557,
                    name: 'Mir Mahathir Mohammad',
                    studentId: '1605011',
                    lastDonation: 987876287160,
                    bloodGroup: 2,
                    hall: 5,
                    roomNumber: '3009',
                    address: 'Azimpur',
                    comment: 'developer of badhan',
                    commentTime: 0,
                    designation: 3,
                    availableToAll: true,
                    callRecords: [
                        {
                            _id: '61018f6f49904a07f010d0c8',
                            callerId: {
                                designation: 1,
                                _id: '61011bd99bf18c82b9e56209',
                                hall: 5,
                                name: 'Mir Mahathir (Volunteer)',
                            },
                            calleeId: '5e6781006ecd148aa8cc76d8',
                            date: 1627492207064,
                            expireAt: '2021-08-27T17:10:07.066Z',
                            __v: 0
                        }
                    ],
                    donations: [
                        {
                            date: 1546300800000,
                            _id: "5e6781006ecd148aa8cc76d8",
                            phone: 8801724097983,
                            donorId: "5e6781006ecd148aa8cc76d8"
                        }
                    ]
                }
            },
            description: 'donor info'
        }

         */

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "READ DONOR", {name: donor.name});

        return res.status(200).send({
            status: 'OK',
            message: 'Successfully fetched donor details',
            donor: donor
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleGETDonorsMe = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the fetching of own details.'

     */

    try {
        let donor = res.locals.middlewareResponse.donor;
        await donor.populate({path: 'callRecords'}).populate({path: 'donations'}).execPopulate();
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Successfully fetched donor details',
                        donor: {
                            _id: 'abjcguiwefvew',
                            phone: 8801521438557,
                            name: 'Mir Mahathir Mohammad',
                            studentId: 1605011,
                            lastDonation: 987876287160,
                            bloodGroup: 2,
                            hall: 5,
                            roomNumber: '3009',
                            address: 'Azimpur',
                            comment: 'Developer of badhan',
                            designation: 3,
                            availableToAll: true
                        }
                    },
                    description: 'Info of the logged in user'
                }
        */
        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "ENTERED APP", {name: donor.name});

        return res.status(200).send({
            status: 'OK',
            message: 'Successfully fetched donor details',
            donor: donor
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleGETVolunteersAll = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Donors']
    #swagger.description = 'Fetches all volunteers'

     */
    try {
        let volunteerResult = await donorInterface.findAllVolunteers();

        if (volunteerResult.status !== 'OK') {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: '(Error message)'
                },
                description: 'Volunteer list fetch unsuccessful'
            }

             */
            return res.status(400).send({
                status: volunteerResult.status,
                message: volunteerResult.message
            });
        }
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Successfully fetched donor details',
                data: [{
                    name: "Mahin Azad",
                    hall: 4,
                    studentId: 1905081,
                    logCount:11,
                }],
            },
            description: 'Volunteer list fetch successful'
        }
*/

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

const handleGETDonorsDuplicate = async (req, res) => {


    /*
    #swagger.auto = false
    #swagger.tags = ['Donors']
    #swagger.description = 'Check whether phone number already exists'
    #swagger.parameters['phone'] = {
        description: 'Phone number of donor',
        type: 'number',
        name: 'phone',
        in: 'query'
    }
     */

    try {
        let authenticatedUser = res.locals.middlewareResponse.donor;

        let duplicateDonorResult = await donorInterface.findDonorByPhone(req.query.phone);

        if (duplicateDonorResult.status === 'OK') {
            if (
                authenticatedUser.designation === 3 ||
                duplicateDonorResult.data.hall === authenticatedUser.hall ||
                duplicateDonorResult.data.hall > 6 ||
                duplicateDonorResult.data.availableToAll === true
            ) {
                /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Donor found with duplicate phone number in Titumir Hall',
                        found: true,
                        donor: '(donor object)'
                    },
                    description: 'If the donor already exists in the database, user will get the error message'
                }

                 */
                return res.status(200).send({
                    status: 'OK',
                    message: 'Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall",
                    found: true,
                    donor: duplicateDonorResult.data,
                });
            }
            /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    message: 'Donor found with duplicate phone number in Titumir hall. You are not permitted to access this donor. ',
                    found: true,
                    donor: 'this field will return null'
                },
                description: 'If the donor with same phone number already exists in the database with another hall name, user will get the error message'
            }

             */
            return res.status(200).send({
                status: 'OK',
                message: 'Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall. You are not permitted to access this donor.",
                found: true,
                donor: null,
            });
        }

        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'No duplicate donors found',
                found: false,
                donor: '(null)'
            },
            description: 'If the phone number does not exist in database'
        }

         */

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET DONORS DUPLICATE", {phone: req.query.phone});

        return res.status(200).send({
            status: 'OK',
            message: 'No duplicate donors found',
            found: false,
            donor: null,
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handlePOSTDonorsPasswordRequest = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Donors']
    #swagger.description = 'Request for password reset link for a user'
    #swagger.parameters['request'] = {
        in: 'body',
        description: 'donorId of the user',
        schema: {
            donorId: 'hdjhd12vhjgj3428569834hth'
        }
    }
 */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;

        if (donor.designation === 0) {
            /*
            #swagger.responses[401] = {
                schema: {
                    status: 'ERROR',
                    message: 'Donor is not a volunteer/ admin',
                },
                description: 'Donor is not a volunteer/ admin'
            }
            */

            return res.status(401).send({
                status: 'ERROR',
                message: 'Donor is not a volunteer/ admin',
            });
        }

        let tokenDeleteResult = await tokenInterface.deleteAllTokensByDonorId(donor._id);

        let tokenInsertResult = await tokenInterface.insertAndSaveToken(donor._id);

        if (tokenInsertResult.status !== 'OK') {
            return res.status(400).send({
                status: 'ERROR',
                message: 'Token insertion failed',
            });
        }
        /*
        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                message: 'Successfully created recovery link for user',
                token: 'dagwerhgiownbweshgewiugnswieugnwkj',
            },
            description: 'Successfully created recovery link for user'
        }
*/
        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "POST DONOR PASSWORD REQUEST", {name: donor.name});

        return res.status(201).send({
            status: 'OK',
            message: "Successfully created recovery link for user",
            token: tokenInsertResult.data.token
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleGETDonorsDesignation  = async (req, res) => {
    try{
        let authenticatedUser = res.locals.middlewareResponse.donor;

        let adminsQueryResult = await donorInterface.findAdmins(2);

        if (adminsQueryResult.status !== 'OK') {
            return res.status(500).send({
                status: adminsQueryResult.status,
                message: adminsQueryResult.message
            });
        }
        let adminList = adminsQueryResult.data;

        let donorsQueryResult = await donorInterface.findVolunteersOfHall( authenticatedUser.hall);

        if (donorsQueryResult.status !== 'OK') {
            return res.status(500).send({
                status: donorsQueryResult.status,
                message: donorsQueryResult.message
            });
        }

        let volunteerList = donorsQueryResult.data;

        let superAdminQuery = await donorInterface.findAdmins(3);

        if (superAdminQuery.status !== 'OK') {
            return res.status(500).send({
                status: superAdminQuery.status,
                message: superAdminQuery.message
            });
        }
        let superAdminList = superAdminQuery.data;

        return res.status(200).send({
            status: 'OK',
            message: "All designated members fetched",
            volunteerList,
            adminList,
            superAdminList
        });
    }catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
};


module.exports = {
    handlePOSTDonors,
    handleDELETEDonors,
    handleGETSearchOptimized,
    handlePATCHDonorsComment,
    handlePATCHDonorsPassword,
    handleGETDonorsDesignation,
    handlePATCHDonors,
    handlePATCHDonorsDesignation,
    handleGETVolunteers,
    handlePATCHAdmins,
    handleGETAdmins,
    handleGETDonors,
    handleGETDonorsMe,
    handleGETVolunteersAll,
    handleGETDonorsDuplicate,
    handlePOSTDonorsPasswordRequest
}
