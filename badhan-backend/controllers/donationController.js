const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
const {
    InternalServerError500,
    NotFoundError,
} = require('../response/errorTypes')
const {CreatedResponse,OKResponse} = require('../response/successTypes');

const handlePOSTDonations = async (req, res, next) => {
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
        #swagger.security = [{
            "api_key": []
        }]


        #swagger.responses[201] = {
            schema: {
                status: 'OK',
                statusCode: 201,
                message: 'Donations inserted successfully',
                newDonation: {
                    date: 1611100800000,
                    _id: "614ec811e29ab430ddfb119a",
                    phone: 8801521438557,
                    donorId: "5e901d56effc5900177ced73",
                }
            },
            description: 'Donations inserted successfully'
        }

     */

    let donor = res.locals.middlewareResponse.targetDonor;

    let donationInsertionResult = await donationInterface.insertDonation({
        phone: donor.phone,
        donorId: donor._id,
        date: req.body.date
    });

    if (donationInsertionResult.status !== 'OK') {
        return res.respond(new InternalServerError500(donationInsertionResult.message));
    }

    if (donor.lastDonation < req.body.date) {
        donor.lastDonation = req.body.date;
    }

    donor.donationCount++;

    await donor.save();

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "CREATE DONATION", {
        ...donationInsertionResult.data,
        donor: donor.name
    });

    return res.respond(new CreatedResponse('Donation inserted successfully',{
        newDonation: donationInsertionResult.data,
    }))
}

const handleDELETEDonations = async (req, res, next) => {
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
        #swagger.security = [{
               "api_key": []
        }]
        #swagger.responses[404] = {
            schema: {
                status: 'ERROR',
                statusCode: 404,
                message: 'Matching donation not found'
            },
            description: 'Error case'
        }
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: 'Successfully deleted donation'
            },
            description: 'Donation deletion successful'
        }
 */

    let donor = res.locals.middlewareResponse.targetDonor;
    let reqQuery = req.query;
    let givenDate = parseInt(reqQuery.date);

    let donationDeletionResult = await donationInterface.deleteDonationByQuery({
        donorId: donor._id,
        date: givenDate
    });

    if (donationDeletionResult.status !== "OK") {
        return res.respond(new NotFoundError('Matching donation not found'))
    }

    donor.donationCount = Math.max(0, donor.donationCount - 1);

    let maxDonationResult = await donationInterface.findMaxDonationByDonorId(donor._id);

    if (maxDonationResult.status === "OK") {
        donor.lastDonation = maxDonationResult.data[0].date;
    } else {
        donor.lastDonation = 0;
    }

    await donor.save();

    await logInterface.addLog(res.locals.middlewareResponse.donor._id, "DELETE DONATION", {
        ...donationDeletionResult.data,
        name: donor.name
    });

    return res.respond(new OKResponse('Successfully deleted donation'),{
        deletedDonation: donationDeletionResult.data,
    })
}

module.exports = {
    handlePOSTDonations,
    handleDELETEDonations,
}
