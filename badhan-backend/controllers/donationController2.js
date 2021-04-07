const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');

/**
 * This function handles the retrieval of donation history for a particular donor.
 * The request body is expected to contain:
 *      donorPhone -> The phone number for the target donor
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handleGETSeeHistory = async (req, res) => {
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: req.body.donorPhone
        }, {});

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;

            let donationsQueryResult = await donationInterface.findDonationsByQuery({
                phone: donor.phone
            }, {});

            if (donationsQueryResult.status === 'OK') {
                let donationDates = donationsQueryResult.data;
                let donations = [];
                donationDates.forEach(donation => {
                    donations.push(donation.date);
                });
                donations.sort(function (a, b) {
                    return b - a
                });

                return res.status(200).send({
                    status: 'OK',
                    message: 'Donations queried successfully',
                    donations
                });
            } else {
                return res.status(400).send({
                    status: donationsQueryResult.status,
                    message: donationsQueryResult.message
                });
            }
        } else {
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
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
 * This function handles the insertion of a new donation for a donor.
 * The request body is expected to contain:
 *      donorPhone -> The phone number for the target donor
 *      date -> The date of the donation that is to be inserted
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTInsertDonation = async (req, res) => {
    try {
        let authenticatedDonor = res.locals.middlewareResponse.donor;

        if (authenticatedDonor.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User is not permitted to add donation'
            });
        }

        let donorQueryResult = await donorInterface.findDonorByQuery({
            phone: req.body.donorPhone
        });

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;

            let newDonationCount = donor.donationCount + 1;


            let donationInsertionResult = await donationInterface.insertDonation({
                phone: donor.phone,
                date: req.body.date
            });

            if (donationInsertionResult.status === 'OK') {
                if (donor.donationCount === 0 || (donor.donationCount !== 0 && req.body.date > donor.lastDonation)) {
                    let donorUpdateResult = await donorInterface.findDonorAndUpdate({
                        phone: donor.phone
                    }, {
                        $set: {
                            lastDonation: req.body.date,
                            donationCount: newDonationCount
                        }
                    });

                    if (donorUpdateResult.status === 'OK') {
                        return res.status(200).send({
                            status: 'OK',
                            message: 'Donation inserted successfully'
                        });
                    } else {
                        let donationQueryResult = await donationInterface.findDonationByQuery({
                            phone: donor.phone,
                            date: req.body.date
                        }, {});

                        await donationInterface.deleteDonation(donationQueryResult.data._id);

                        return res.status(400).send({
                            status: 'ERROR',
                            message: 'Donation insertion unsuccessful'
                        });
                    }

                } else if (donor.donationCount !== 0 && req.body.date <= donor.lastDonation) {
                    let donorUpdateResult = await donorInterface.findDonorAndUpdate({
                        phone: donor.phone
                    }, {
                        $set: {
                            donationCount: newDonationCount
                        }
                    });

                    if (donorUpdateResult.status === 'OK') {
                        return res.status(200).send({
                            status: 'OK',
                            message: 'Donation inserted successfully'
                        });
                    } else {
                        let donationQueryResult = await donationInterface.findDonationByQuery({
                            phone: donor.phone,
                            date: req.body.date
                        }, {});

                        await donationInterface.deleteDonation(donationQueryResult.data._id);

                        return res.status(400).send({
                            status: 'ERROR',
                            message: 'Donation insertion unsuccessful'
                        });
                    }
                }

            } else {
                return res.status(400).send({
                    status: 'ERROR',
                    message: donationInsertionResult.message
                });
            }
        } else {
            return res.status(400).send({
                status: 'ERROR',
                message: 'Target donor not found'
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
 * This function handles the deletion of a donation for a donor.
 * The request body is expected to contain:
 *      donorPhone -> The phone number for the target donor
 *      date -> The date of the donation that is to be deleted
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTDeleteDonation = async (req, res) => {
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

        let donationsQueryResult = await donationInterface.findDonationsByQuery({
            phone: req.body.donorPhone
        });

        if (donationsQueryResult.status !== 'OK') {
            return res.status(400).send({
                status: donationsQueryResult.status,
                message: donationsQueryResult.message
            });
        }

        let donationDates = donationsQueryResult.data;

        if (donationDates.length === 0) {
            return res.status(400).send({
                status: 'ERROR',
                message: 'No donations found for the specified donor on this date'
            });
        }

        let donations = [];

        donationDates.forEach(donation => {
            donations.push(donation.date);
        })

        donations.sort(function (a, b) {
            return a - b
        });

        let givenDate = req.body.date;
        let isValidDate = donations.includes(givenDate);

        if (!isValidDate) {
            return res.status(400).send({
                status: 'ERROR',
                message: 'No donations found for the specified donor on this date'
            });
        }

        let newLastDonation = donations[donationDates.length - 1];
        let totalDonations = donor.donationCount;

        for (let i = 0; i < donations.length; i++) {
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

        let donationDeleteResult = await donationInterface.deleteDonationByQuery({
            phone: req.body.donorPhone,
            date: req.body.date
        })

        if (donationDeleteResult.status !== 'OK') {
            return res.status(400).send({
                status: donationDeleteResult.status,
                message: donationDeleteResult.message
            });
        }

        let donorUpdateResult = await donorInterface.findDonorAndUpdate({
            phone: req.body.donorPhone
        }, {
            $set: {
                lastDonation: newLastDonation,
                donationCount: totalDonations - 1
            }
        });

        if (donorUpdateResult.status !== 'OK') {
            return res.status(400).send({
                status: 'ERROR',
                message: 'Donation deleted but donor profile not updated concurrently. Inconsistent state reached.'
            });
        }

        return res.status(200).send({
            status: 'OK',
            message: 'Successfully deleted donation'
        });

    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

module.exports = {
    handleGETSeeHistory,
    handlePOSTInsertDonation,
    handlePOSTDeleteDonation
}