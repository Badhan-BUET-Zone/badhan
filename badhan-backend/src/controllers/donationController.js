const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const {
  InternalServerError500,
  NotFoundError404
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

/**
 * @openapi
 * /donations:
 *   post:
 *     tags:
 *       - Donations
 *     summary: Post donations route
 *     description: Endpoint to insert a donation date for a donor
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON consisting of donor info for inserting donation
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: bhjdekj8923
 *               date:
 *                 type: number
 *                 example: 1611100800000
 *     responses:
 *       201:
 *         description: Donations inserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Donations inserted successfully
 *                 newDonation:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: timestamp
 *                       example: 1611100800000
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     phone:
 *                       type: string
 *                       example: 8801521438557
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc5900177ced73
 */
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

  const donor = res.locals.middlewareResponse.targetDonor

  const donationInsertionResult = await donationInterface.insertDonation({
    phone: donor.phone,
    donorId: donor._id,
    date: req.body.date
  })

  if (donationInsertionResult.status !== 'OK') {
    return res.respond(new InternalServerError500(donationInsertionResult.message))
  }

  if (donor.lastDonation < req.body.date) {
    donor.lastDonation = req.body.date
  }

  await donor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST DONATIONS', {
    ...donationInsertionResult.data,
    donor: donor.name
  })

  return res.respond(new CreatedResponse201('Donation inserted successfully', {
    newDonation: donationInsertionResult.data
  }))
}

/**
 * @openapi
 * /donations:
 *   delete:
 *     tags:
 *       - Donations
 *     summary: Delete users login route
 *     security:
 *       - ApiKeyAuth: []
 *     description: handles the deletion of a donation for a donor
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: Donor id for deleting donations
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: date
 *         description: Donation date for deleting donation
 *         required: true
 *         schema:
 *           type: number
 *           example: 1611100800000
 *     responses:
 *       200:
 *         description: Donation deletion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully deleted donation
 *       404:
 *         description: Error case
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Matching donation not found
 */
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

  const donor = res.locals.middlewareResponse.targetDonor
  const reqQuery = req.query
  const givenDate = parseInt(reqQuery.date)

  const donationDeletionResult = await donationInterface.deleteDonationByQuery({
    donorId: donor._id,
    date: givenDate
  })

  if (donationDeletionResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Matching donation not found'))
  }

  const maxDonationResult = await donationInterface.findMaxDonationByDonorId(donor._id)

  if (maxDonationResult.status === 'OK') {
    donor.lastDonation = maxDonationResult.data[0].date
  } else {
    donor.lastDonation = 0
  }

  await donor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE DONATIONS', {
    ...donationDeletionResult.data,
    name: donor.name
  })

  return res.respond(new OKResponse200('Successfully deleted donation'), {
    deletedDonation: donationDeletionResult.data
  })
}

module.exports = {
  handlePOSTDonations,
  handleDELETEDonations
}
