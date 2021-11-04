const util = require('util');
const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
const tokenInterface = require('../db/interfaces/tokenInterface');
const emailInterface = require('../db/interfaces/emailInterface');
const {halls} = require('../constants')

const {
    InternalServerError500,
    BadRequestError400,
    ForbiddenError403,
    NotFoundError404,
    UnauthorizedError401,
    TooManyRequestsError429,
    ConflictError409
} = require('../response/errorTypes')
const {CreatedResponse201, OKResponse200} = require('../response/successTypes');


const handlePOSTDonors = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */
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
                    statusCode: 409,
                    message: 'Donor found with duplicate phone number',
                    donor: 'donor array'
                },
                description: 'If the donor already exists in the database, user will get the error message'
            }

             */
            return res.respond(new ConflictError409('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall"));
        }
        /*
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'Donor found with duplicate phone number in another hall',
                donor: 'this field will return null'
            },
            description: 'If the donor with same phone number already exists in the database with another hall name, user will get the error message'
        }

         */
        return res.respond(new ConflictError409('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall. You are not permitted to access this donor."))
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
        // donationCount: req.body.extraDonationCount,
        availableToAll: availableToAll,
    };

    let donorInsertionResult = await donorInterface.insertDonor(donorObject);
    if (donorInsertionResult.status !== 'OK') {
        return res.respond(new InternalServerError500('New donor insertion unsuccessful'));
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
        return res.respond(new InternalServerError500('Dummy donations insertion unsuccessful'));
    }


    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "POST DONORS", donorInsertionResult.data);
    /*
        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                statusCode: 201,
                message: 'New donor inserted successfully',
                "newDonor": {
                    "address": "Azimpur Road",
                    "roomNumber": "4568",
                    "designation": 0,
                    "lastDonation": 0,
                    "comment": "Has Diabetes",
                    "commentTime": 16547822145,
                    "email": "",
                    "_id": "616ab751fc274715cc504ac7",
                    "phone": 8801546587552,
                    "bloodGroup": 1,
                    "hall": 8,
                    "name": "Mir Mahathir",
                    "studentId": "2105011",
                    "availableToAll": true
                }

            },
            description: 'successful donor insertion'
        }

     */
    return res.respond(new CreatedResponse201('New donor inserted successfully', {
        newDonor: donorInsertionResult.data
    }))
}

const handleDELETEDonors = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'handles the deletion of an existing donor from the database.'
        #swagger.parameters['donorId'] = {
            in: 'query',
            description: 'donor id for deleting donation',
            type: 'string'
        }
        #swagger.security = [{
               "api_key": []
        }]

     */

    let donor = res.locals.middlewareResponse.targetDonor;

    if (donor.designation > 1) {
        return res.respond(new ConflictError409("Donor must be demoted for deletion"));
    }

    let deleteDonorResult = await donorInterface.deleteDonorById(donor._id);
    if (deleteDonorResult.status !== 'OK') {
        return res.respond(new InternalServerError500("Error occurred in deleting target donor"));
    }

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "DELETE DONORS", deleteDonorResult.data);
    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Donor deleted successfully'
                },
                description: 'Successful donor deletion'
            }

     */
    return res.respond(new OKResponse200('Donor deleted successfully'));
}


const handleGETSearchOptimized = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */

    let reqQuery = req.query;

    // console.log(util.inspect(reqQuery, false, null, true /* enable colors */))

    if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall
        && reqQuery.hall <= 6
        && res.locals.middlewareResponse.donor.designation !== 3) {
        /*
        #swagger.responses[403] = {
            schema: {
                status: 'ERROR',
                statusCode: 403,
                message: 'You are not allowed to search donors of other halls'
            },
            description: 'This error will occur if the user tries to search other halls'
        }

         */
        return res.respond(new ForbiddenError403('You are not allowed to search donors of other halls'));
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

    result.data.sort((donor1, donor2) =>
        donor1.donationCountOptimized >= donor2.donationCountOptimized ? -1 : 1
    )
    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET SEARCH", {
        filter: reqQuery,
        resultCount: result.data.length
    })

    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
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
    return res.respond(new OKResponse200('Donors queried successfully', {
        filteredDonors: result.data
    }))
}

const handlePATCHDonorsComment = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */


    let targetDonor = res.locals.middlewareResponse.targetDonor;

    targetDonor.comment = req.body.comment;
    targetDonor.commentTime = new Date().getTime();
    await targetDonor.save();

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PATCH DONORS COMMENT", targetDonor);

    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Comment updated successfully'
                },
                description: 'In case of successfully saving the comment'
            }

     */
    return res.respond(new OKResponse200('Comment updated successfully'))
}

const handlePATCHDonorsPassword = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */
    let reqBody = req.body;

    let target = res.locals.middlewareResponse.targetDonor;

    if (target.designation === 0) {
        /*
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'Target user does not have an account'
            },
            description: 'Target user does not have an account'
        }

         */
        return res.respond(new ConflictError409('Target user does not have an account'));
    }


    target.password = reqBody.password;

    await target.save();

    await tokenInterface.deleteAllTokensByDonorId(target._id);

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PATCH DONORS PASSWORD", {name: target.name});

    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Password changed successfully'
        },
        description: 'Successful password change done'
    }

     */
    return res.respond(new OKResponse200('Password changed successfully'));
}

const handlePATCHDonors = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */

    /*
    #swagger.responses[404] = {
        schema: {
            status: 'ERROR',
            statusCode: 404,
            message: 'Email address does not exist'
        },
        description: 'Donor info update successful'
    }

    #swagger.responses[403] = {
        schema: {
            status: 'ERROR',
            statusCode: 403,
            message: 'You do not have permission to edit email address of another user'
        },
        description: 'You do not have permission to edit email address of another user'
    }

     */
    let reqBody = req.body;

    let target = res.locals.middlewareResponse.targetDonor;
    let user = res.locals.middlewareResponse.donor;

    if (reqBody.email !== "" && !await emailInterface.checkIfEmailExists(reqBody.email)) {
        return res.respond(new NotFoundError404('Email address does not exist'));
    }

    if (target.email !== reqBody.email && !target._id.equals(user._id)) {
        return res.respond(new ForbiddenError403('You do not have permission to edit email address of another user'))
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

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PATCH DONORS", target);
    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Donor updated successfully'
                },
                description: 'Donor info update successful'
            }

     */
    return res.respond(new OKResponse200('Donor updated successfully'));
}

const handlePATCHDonorsDesignation = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */
    let donor = res.locals.middlewareResponse.targetDonor;
    let donorDesignation = donor.designation;


    if ((donorDesignation === 1 && req.body.promoteFlag)
        || (donorDesignation === 0 && !req.body.promoteFlag)) {
        /*
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'Can not promote volunteer or can not demote donor/ Donor does not have a valid hall'
            },
            description: 'If user cannot promote volunteer or cannot demote donor/ Donor does not have a valid hall'
        }

         */
        return res.respond(new ConflictError409('Can\'t promote volunteer or can\'t demote donor'));
    }

    if (donor.hall > 6) {
        return res.respond(new ConflictError409('Donor does not have a valid hall'));
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

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PATCH DONORS DESIGNATION (" + logOperation + ")", donor);
    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Target user promoted/demoted successfully'
        },
        description: 'Donor promotion/ demotion successful'
    }

     */
    return res.respond(new OKResponse200('Target user promoted/demoted successfully'));
}

const handlePATCHAdmins = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]
     */
    let targetDonor = res.locals.middlewareResponse.targetDonor;

    if (targetDonor.designation !== 1) {
        /*
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'User is not a volunteer'
            },
            description: 'If fetched user is not a volunteer , user will get this error message'
        }
         */
        return res.respond(new ConflictError409('User is not a volunteer'));
    }

    if (targetDonor.hall > 6) {
        return res.respond(new ConflictError409('User does not have a valid hall'));
    }

    let prevHallAdminUpdateResult = await donorInterface.findDonorAndUpdate({
        hall: targetDonor.hall,
        designation: 2
    }, {
        $set: {designation: 1}
    });

    if (prevHallAdminUpdateResult.status !== 'OK') {
        return res.respond(new InternalServerError500(prevHallAdminUpdateResult.message));
    }

    // Make new hall admin
    targetDonor.designation = 2;
    await targetDonor.save();

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "PATCH DONORS DESIGNATION (VOLUNTEER)", {name: targetDonor.name});
    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Successfully changed hall admin'
                },
                description: 'Successfully changed hall admin'
            }

     */
    return res.respond(new OKResponse200('Successfully changed hall admin'));
}


const handleGETDonors = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]

     */

    let donor = res.locals.middlewareResponse.targetDonor;
    await donor.populate([
        {
            path: 'donations',
            options: {sort: {'date': -1}}
        },
        {
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
        },
        {
            path: 'publicContacts',
            select: {
                '_id': 1,
                'bloodGroup': 1
            }
        }
    ])

    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Successfully fetched donor details',
            donor: {
                _id: 'abjcguiwefvew',
                phone: 8801521438557,
                name: 'Mir Mahathir Mohammad',
                studentId: '1605011',
                email:'mirmahathir1@gmail.com',
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
                ],
                "publicContacts": [
                    {
                        "bloodGroup": 2,
                        "_id": "6142dfc11f536f2e2db0f780",
                        "donorId": "5e901d56effc5900177ced73"
                    },
                ]
            }
        },
        description: 'donor info'
    }

     */

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET DONORS", {name: donor.name});

    return res.respond(new OKResponse200('Successfully fetched donor details', {
        donor
    }));

}

const handleGETDonorsMe = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donors']
        #swagger.description = 'Handles the fetching of own details.'
        #swagger.security = [{
               "api_key": []
        }]
     */

    let donor = res.locals.middlewareResponse.donor;
    /*
            #swagger.responses[200] = {
                schema: {
                    status: 'OK',
                    statusCode: 200,
                    message: 'Successfully fetched donor details',
                    donor: {
                        _id: 'abjcguiwefvew',
                        phone: 8801521438557,
                        name: 'Mir Mahathir Mohammad',
                        studentId: "1605011",
                        email: "mirmahathir1@gmail.com",
                        lastDonation: 987876287160,
                        bloodGroup: 2,
                        hall: 5,
                        roomNumber: '3009',
                        address: 'Azimpur',
                        comment: 'Developer of badhan',
                        commentTime: 1634921130787,
                        designation: 3,
                        availableToAll: true
                    }
                },
                description: 'Info of the logged in user'
            }
    */
    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "ENTERED APP", {name: donor.name});

    return res.respond(new OKResponse200('Successfully fetched donor details', {
        donor
    }))
}

const handleGETVolunteersAll = async (req, res, next) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Donors']
    #swagger.description = 'Fetches all volunteers'
    #swagger.security = [{
               "api_key": []
        }]

     */
    let volunteerResult = await donorInterface.findAllVolunteers();

    if (volunteerResult.status !== 'OK') {
        return res.respond(new InternalServerError500(volunteerResult.message));
    }
    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Successfully fetched donor details',
            data: [{
                _id: "5e6776166f73f925e22a05aa",
                name: "Mahin Azad",
                hall: 4,
                studentId: 1905081,
                logCount:11,
            }],
        },
        description: 'Volunteer list fetch successful'
    }
*/

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET VOLUNTEERS ALL", {});

    return res.respond(new OKResponse200('Successfully fetched donor details', {
        data: volunteerResult.data
    }))
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
    #swagger.security = [{
               "api_key": []
        }]
     */

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
                                statusCode: 200,
                                message: 'Donor found with duplicate phone number in Titumir Hall',
                                "found": true,
                                "donor": {
                                    "address": "Azimpur",
                                    "roomNumber": "3009",
                                    "designation": 3,
                                    "lastDonation": 1634196816955,
                                    "comment": "Developer of Badhan",
                                    "commentTime": 1634838132020,
                                    "email": "mirmahathir1@gmail.com",
                                    "_id": "5e901d56effc5900177ced73",
                                    "phone": 8801521438557,
                                    "bloodGroup": 2,
                                    "hall": 5,
                                    "name": "Mir Mahathir Mohammad",
                                    "studentId": "1605011",
                                    "availableToAll": true
                                }
                            },
                            description: 'If the donor already exists in the database, user will get the error message'
                        }

             */

            return res.respond(new OKResponse200('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall", {
                found: true,
                donor: duplicateDonorResult.data,
            }))
        }

        return res.respond(new OKResponse200('Donor found with duplicate phone number in ' + halls[duplicateDonorResult.data.hall] + " hall. You are not permitted to access this donor.", {
            found: true,
            donor: null,
        }))
    }

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET DONORS CHECKDUPLICATE", {phone: req.query.phone});

    return res.respond(new OKResponse200('No duplicate donors found', {
        found: false,
        donor: null,
    }))
}

const handlePOSTDonorsPasswordRequest = async (req, res, next) => {
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
    #swagger.security = [{
               "api_key": []
        }]
 */
    let donor = res.locals.middlewareResponse.targetDonor;

    if (donor.designation === 0) {
        /*
        #swagger.responses[409] = {
            schema: {
                status: 'ERROR',
                statusCode: 409,
                message: 'Donor is not a volunteer/ admin',
            },
            description: 'Donor is not a volunteer/ admin'
        }
        */
        return res.respond(new ConflictError409('Donor is not a volunteer/ admin'));
    }

    let tokenDeleteResult = await tokenInterface.deleteAllTokensByDonorId(donor._id);
    if (tokenDeleteResult.status !== 'OK') {
        return res.respond(new InternalServerError500(tokenDeleteResult.message));
    }

    let tokenInsertResult = await tokenInterface.insertAndSaveToken(donor._id, req.userAgent);
    if (tokenInsertResult.status !== 'OK') {
        return res.respond(new InternalServerError500(tokenInsertResult.message));
    }
    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Successfully created recovery link for user',
            token: 'dagwerhgiownbweshgewiugnswieugnwkj',
        },
        description: 'Successfully created recovery link for user'
    }
*/
    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "POST DONORS PASSWORD (REQUEST)", {name: donor.name});

    return res.respond(new OKResponse200("Successfully created recovery link for user", {
        token: tokenInsertResult.data.token
    }));
}

const handleGETDonorsDesignation = async (req, res, next) => {
    /*
#swagger.auto = false
#swagger.tags = ['Donors']
#swagger.description = 'Request get list of volunteers of own hall, all hall admins and super admins'
#swagger.security = [{
               "api_key": []
        }]
*/

    /*
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: "All designated members fetched",
            "volunteerList": [
                {
                    "roomNumber": "4011",
                    "_id": "5e68514995b0367d81546b29",
                    "studentId": "1606037",
                    "name": "Md. Nasim Afroj Taj",
                    "bloodGroup": 2,
                    "phone": 8801876834245
                },
            ],
            "adminList": [
                {
                    "_id": "5e6776c090b43cdb0ddf347a",
                    "studentId": "1704194",
                    "name": "Oyshee Chowdhury",
                    "phone": 8801997331062,
                    "hall": 1
                },
            ],
            "superAdminList": [
                {
                    "_id": "5e6776166f73f925e22a05e8",
                    "studentId": "1805064",
                    "name": "Sanju Basak",
                    "phone": 8801774377473,
                    "hall": 0
                },
            ]
        },
        description: "All designated members fetched"
    }

     */

    let authenticatedUser = res.locals.middlewareResponse.donor;

    let adminsQueryResult = await donorInterface.findAdmins(2);
    if (adminsQueryResult.status !== 'OK') {
        return res.respond(new InternalServerError500(adminsQueryResult.message));
    }
    let adminList = adminsQueryResult.data;

    let donorsQueryResult = await donorInterface.findVolunteersOfHall(authenticatedUser.hall);
    if (donorsQueryResult.status !== 'OK') {
        return res.respond(new InternalServerError500(donorsQueryResult.message));
    }

    let volunteerList = donorsQueryResult.data;

    let superAdminQuery = await donorInterface.findAdmins(3);
    if (superAdminQuery.status !== 'OK') {
        return res.respond(new InternalServerError500(superAdminQuery.message));
    }
    let superAdminList = superAdminQuery.data;

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "GET DONORS DESIGNATION", {});

    return res.respond(new OKResponse200("All designated members fetched", {
        volunteerList,
        adminList,
        superAdminList
    }));
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
    handlePATCHAdmins,
    handleGETDonors,
    handleGETDonorsMe,
    handleGETVolunteersAll,
    handleGETDonorsDuplicate,
    handlePOSTDonorsPasswordRequest
}
