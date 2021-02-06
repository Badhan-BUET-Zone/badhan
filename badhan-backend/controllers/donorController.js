const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');


/**
 * This function handles the insertion of a new donor into the database.
 * The request body is expected to contain donorObject which is a JSON object containing
 * a fully constructed donor document.
 *
 * @param req The request for this http request-response cycle.
 * @param res The response for this http request-response cycle.
 */
const handlePOSTInsertDonor = async (req, res) => {
    try {
        let authenticatedDonor = res.locals.middlewareResponse.donor;

        if (authenticatedDonor.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User does not have permission to add donors'
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
            comment: req.body.comment
        };
        
        let donorInsertionResult = await donorInterface.insertDonor(donorObject);

        if (donorInsertionResult.status === 'OK') {
            if (donorObject.lastDonation !== 0) {
                // Insert Donation Here
                let donationObject = {
                    phone: donorObject.phone,
                    date: donorObject.lastDonation
                }

                let donationInsertionResult = await donationInterface.insertDonation(donationObject);

                if (donationInsertionResult.status === 'OK') {
                    return res.status(201).send({
                        status: 'OK',
                        message: 'New donor inserted successfully'
                    });
                } else {
                    let donorQueryResult = await donorInterface.findDonorByQuery({phone: req.body.donorObject.phone}, {});
                    let insertedDonor = donorQueryResult.data;
                    await donorInterface.deleteDonor(insertedDonor._id);

                    return res.status(400).send({
                        status: 'ERROR',
                        message: 'New donor insertion unsuccessful'
                    });
                }
            }
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
 * The request body is expected to contain a search filter, that can optionally be empty.
 * An empty search filter would return all donor documents in the database.
 *
 * @param req The request for this http request-response cycle.
 * @param res The response for this http request-response cycle.
 */
const handleGETSearchDonors = async (req, res) => {
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

            const filteredDonors = [];

            for (let i = 0; i < donors.length; i++) {
                let obj = {
                    phone: donors[i].phone,
                    name: donors[i].name,
                    studentId: donors[i].studentId,
                    lastDonation: donors[i].lastDonation,
                    bloodGroup: donors[i].bloodGroup
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
        res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

/**
 * This function adds a comment to a donor's profile.
 * The request body is expected to contain donorPhone, which is the phone
 * number of the donor to whose profile the comment is to be added.
 * The request body is expected to contain comment, which is the comment to be added
 *
 * @param req The request for this http request-response cycle.
 * @param res The response for this http request-response cycle.
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


module.exports = {
    handlePOSTInsertDonor,
    handleGETSearchDonors
}