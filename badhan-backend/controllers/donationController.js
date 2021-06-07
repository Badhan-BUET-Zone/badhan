const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
/** DONE
 * This function handles the retrieval of donation history for a particular donor.
 * The request body is expected to contain:
 *      donorPhone -> The phone number for the target donor
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handleGETSeeHistory = async (req, res) => {
    /*  #swagger.tags = ['Donations']
            #swagger.description = 'handles the retrieval of donation history for a particular donor.' */
    /* #swagger.parameters['seeHistory'] = {
               in: 'body',
               description: 'donor info for inserting donor',
               schema:{
                donorId:'bhjdekj8923'
               }
      } */
    try {
        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
        }, {});

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;

            let donationsQueryResult = await donationInterface.findDonationsByQuery({
                donorId: donor._id
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
                /* #swagger.responses[200] = {
           schema: {
             status: 'OK',
             message: 'Donations queried successfully',
             donations : [1611100800000, 1558051200000, 1557964800000, 1546300800000]
            },
           description: 'Donations queried successful'
    } */
                return res.status(200).send({
                    status: 'OK',
                    message: 'Donations queried successfully',
                    donations
                });
            } else {
                /* #swagger.responses[400] = {
            schema: {
              status: 'ERROR',
              message: 'Error message'
             },
            description: 'Donor query unsuccessful'
     } */
                return res.status(400).send({
                    status: donationsQueryResult.status,
                    message: donationsQueryResult.message
                });
            }
        } else {
            /* #swagger.responses[400] = {
           schema: {
             status: 'ERROR',
             message: 'Error message'
            },
           description: 'Donor query unsuccessful'
    } */
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }
    } catch (e) {
        /* #swagger.responses[200] = {
           schema: {
             status: 'OK',
             message: 'Successfully fetched donor details'
            },
           description: 'Volunteer list fetch successful'
    } */
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
    /*  #swagger.tags = ['Donations']
            #swagger.description = 'Endpoint to insert a donation date for a donor' */
    /* #swagger.parameters['insertDonation'] = {
               in: 'body',
               description: 'donor info for inserting donation',
               schema:{
                donorId:'bhjdekj8923',
                date:'15/2/2021',
               }
      } */
    try {
        let authenticatedDonor = res.locals.middlewareResponse.donor;

        if (authenticatedDonor.designation === 0) {
            return res.status(401).send({
                status: 'ERROR',
                message: 'User is not permitted to add donation'
            });
        }

        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
        },{});

        if (donorQueryResult.status === 'OK') {
            let donor = donorQueryResult.data;

            let newDonationCount = donor.donationCount + 1;


            let donationInsertionResult = await donationInterface.insertDonation({
                phone: donor.phone,
                donorId: donor._id,
                date: req.body.date
            });

            if (donationInsertionResult.status === 'OK') {
                if(process.env.NODE_ENV !== 'development') {
                    await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "CREATE DONATION", donationInsertionResult.data);
                }
                if (donor.donationCount === 0 || (donor.donationCount !== 0 && req.body.date > donor.lastDonation)) {
                    let donorUpdateResult = await donorInterface.findDonorAndUpdate({
                        _id: donor._id
                    }, {
                        $set: {
                            lastDonation: req.body.date,
                            donationCount: newDonationCount
                        }
                    });

                    if (donorUpdateResult.status === 'OK') {
                        /* #swagger.responses[200] = {
             schema: {
               status: 'OK',
               message: 'Donation inserted successfully'
              },
             description: 'Donation insertion successful'
      } */
                        return res.status(200).send({
                            status: 'OK',
                            message: 'Donation inserted successfully'
                        });
                    } else {
                        let donationQueryResult = await donationInterface.findDonationByQuery({
                            donorId: donor._id,
                            date: req.body.date
                        }, {});

                        await donationInterface.deleteDonation(donationQueryResult.data._id);
                        /* #swagger.responses[400] = {
              schema: {
                status: 'ERROR',
                message: 'Donation insertion unsuccessful'
               },
              description: 'Donation insertion unsuccessful'
       } */
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
                        /* #swagger.responses[200] = {
           schema: {
             status: 'OK',
             message: 'Donation inserted successfully'
            },
           description: 'Donation insertion successful'
    } */
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
                        /* #swagger.responses[400] = {
              schema: {
                status: 'ERROR',
                message: 'Error message'
               },
              description: 'Donation insertion unsuccessful'
       } */

                        return res.status(400).send({
                            status: 'ERROR',
                            message: donorUpdateResult.message
                        });
                    }
                }

            } else {
                /* #swagger.responses[400] = {
                schema: {
                  status: 'ERROR',
                  message: 'Error message'
                 },
                description: 'Donation insertion unsuccessful'
         } */
                return res.status(400).send({
                    status: 'ERROR',
                    message: donationInsertionResult.message
                });
            }
        } else {
            /* #swagger.responses[400] = {
              schema: {
                status: 'ERROR',
                message: 'Error message'
               },
              description: 'Donation insertion unsuccessful'
       } */
            return res.status(400).send({
                status: 'ERROR',
                message: 'Target donor not found'
            });
        }
    } catch (e) {
        /* #swagger.responses[500] = {
             schema: {
                    status: 'EXCEPTION',
                    message: 'Internal server error'
              },
             description: 'In case of internal server error, user will get this error message'
      } */
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

/** DONE
 * This function handles the deletion of a donation for a donor.
 * The request body is expected to contain:
 *      donorPhone -> The phone number for the target donor
 *      date -> The date of the donation that is to be deleted
 *
 * @param req The request for this http request-response cycle
 * @param res The response for this http request-response cycle
 */
const handlePOSTDeleteDonation = async (req, res) => {
    /*  #swagger.tags = ['Donations']
            #swagger.description = 'handles the deletion of a donation for a donor.' */
    /* #swagger.parameters['deleteDonation'] = {
              in: 'body',
              description: 'donor info for deleting donation',
              schema:{
               donorId:'bhjdekj8923'
              }
     } */
    try {

        let donorQueryResult = await donorInterface.findDonorByQuery({
            _id: req.body.donorId
        });

        if (donorQueryResult.status !== 'OK') {
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error status',
               message: 'Error message'
              },
             description: 'Donation deletion unsuccessful'
      } */
            return res.status(400).send({
                status: donorQueryResult.status,
                message: donorQueryResult.message
            });
        }

        let donor = donorQueryResult.data;

        let donationsQueryResult = await donationInterface.findDonationsByQuery({
            donorId: donor._id
        });

        if (donationsQueryResult.status !== 'OK') {
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error status',
               message: 'Error message'
              },
             description: 'Donation deletion unsuccessful'
      } */
            return res.status(400).send({
                status: donationsQueryResult.status,
                message: donationsQueryResult.message
            });
        }

        let donationDates = donationsQueryResult.data;

        if (donationDates.length === 0) {
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error status',
               message: 'No donations found for the specified donor on this date'
              },
             description: 'No Donation found to delete'
      } */
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
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error status',
               message: 'No donations found for the specified donor on this date'
              },
             description: 'No Donation found for the specified date to delete'
      } */
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
            donorId: req.body.donorId,
            date: req.body.date
        });
        if(process.env.NODE_ENV !== 'development') {
            await logInterface.addLog(res.locals.middlewareResponse.donor.name, res.locals.middlewareResponse.donor.hall, "DELETE DONATION", donationDeleteResult.data);
        }

        if (donationDeleteResult.status !== 'OK') {
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error status',
               message: 'Error message'
              },
             description: 'Donation deletion unsuccessful'
      } */
            return res.status(400).send({
                status: donationDeleteResult.status,
                message: donationDeleteResult.message
            });
        }

        let donorUpdateResult = await donorInterface.findDonorAndUpdate({
            _id: req.body.donorId
        }, {
            $set: {
                lastDonation: newLastDonation,
                donationCount: totalDonations - 1
            }
        });

        if (donorUpdateResult.status !== 'OK') {
            /* #swagger.responses[400] = {
             schema: {
               status: 'Error',
               message: 'Donation deleted but donor profile not updated concurrently. Inconsistent state reached.'
              },
             description: 'Donation deleted but donor profile not updated concurrently. Inconsistent state reached.'
      } */
            return res.status(400).send({
                status: 'ERROR',
                message: 'Donation deleted but donor profile not updated concurrently. Inconsistent state reached.'
            });
        }

        /* #swagger.responses[200] = {
             schema: {
               status: 'OK',
               message: 'Successfully deleted donation'
              },
             description: 'Donation deletion successful'
      } */
        return res.status(200).send({
            status: 'OK',
            message: 'Successfully deleted donation'
        });

    } catch (e) {
        /* #swagger.responses[500] = {
            schema: {
                   status: 'EXCEPTION',
                   message: 'Internal server error'
             },
            description: 'In case of internal server error, user will get this error message'
     } */
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
