const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');

const handlePOSTDonations = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Donations']
    #swagger.description = 'Endpoint to insert a donation date for a donor'
    #swagger.parameters['insertDonation'] = {
        in: 'body',
        description: 'Donor info for inserting donation',
        schema: {
            donorId: 'bhjdekj8923',
            date: 1611100800000,
        }
    }

     */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;

        let donationInsertionResult = await donationInterface.insertDonation({
            phone: donor.phone,
            donorId: donor._id,
            date: req.body.date
        });

        if (donationInsertionResult.status !== 'OK') {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: '(Error message)'
                },
                description: 'Donation insertion unsuccessful'
            }

             */
            return res.status(400).send({
                status: 'ERROR',
                message: donationInsertionResult.message
            });
        }

        await logInterface.addLog(res.locals.middlewareResponse.donor._id, "CREATE DONATION", {
            date: new Date(donationInsertionResult.data.date).toLocaleString(),
            donor: donor.name
        });

        if (donor.lastDonation < req.body.date) {
            donor.lastDonation = req.body.date;
        }

        donor.donationCount++;

        await donor.save();
        /*
        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                message: 'Donations inserted successfully'
            },
            description: 'Donations inserted successfully'
        }

         */

        return res.status(201).send({
            status: 'OK',
            message: 'Donation inserted successfully'
        });


    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleDELETEDonations = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Donations']
        #swagger.description = 'handles the deletion of a donation for a donor.'
        #swagger.parameters['donorId'] = {
            in: 'query',
            description: 'donor id for deleting donation',
            type: 'string'
        }
        #swagger.parameters['date'] = {
            in: 'query',
            description: 'donation date for deleting donation',
            type: 'number'
        }

     */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;

        let reqQuery = req.query;

        let givenDate = parseInt(reqQuery.date);


        let donationDeletionResult = await donationInterface.deleteDonationByQuery({
            donorId: donor._id,
            date: givenDate
        });

        // console.log(donationDeletionResult.data)

        if (donationDeletionResult.status !== "OK") {
            return res.status(404).send({
                status: 'OK',
                message: 'Donation deletion unsuccessful'
            });
        }

        donor.donationCount = Math.max(0, donor.donationCount - 1);

        let maxDonationResult = await donationInterface.findMaxDonationByDonorId(donor._id);

        if (maxDonationResult.status === "OK") {
            donor.lastDonation = maxDonationResult.data[0].date;
        } else {
            donor.lastDonation = 0;
        }

        await donor.save();
/*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Successfully deleted donation'
            },
            description: 'Donation deletion successful'
        }

 */
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
    handlePOSTDonations,
    handleDELETEDonations,
}
