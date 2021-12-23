const publicContactInterface = require('../db/interfaces/publicContactInterface')
const logInterface = require('../db/interfaces/logInterface')
const {
  InternalServerError500,
  NotFoundError404,
  ConflictError409
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

/**
 * @openapi
 * /publicContacts:
 *   post:
 *     tags:
 *       - Public Contacts
 *     summary: Post public contact route
 *     description: Endpoint to insert a public contact
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       description: The JSON contains the donor id and assigned blood group of contact
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               donorId:
 *                 type: string
 *                 example: bhjdekj8923
 *               bloodGroup:
 *                 type: number
 *                 example: 2
 *     responses:
 *       201:
 *         description: Success message
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
 *                   example: Public contact added successfully
 *                 newActiveDonor:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 614ec811e29ab430ddfb119a
 *                     donorId:
 *                       type: string
 *                       example: 5e901d56effc5900177ced73
 *                     bloodGroup:
 *                       type: number
 *                       example: 2
 */
const handlePOSTPublicContact = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Public Contacts']
    #swagger.description = 'Endpoint to insert a public contact'
    #swagger.security = [{
               "api_key": []
        }]
    #swagger.parameters['PublicContactObject'] = {
        in: 'body',
        description: 'Contains the donor id and assigned blood group of contact',
        schema: {
            donorId: 'fwetiubg43t6847gsdffwekt',
            bloodGroup: 2
        }
    }
    #swagger.responses[201] = {
        schema: {
            status: 'OK',
            statusCode: 201,
            message: 'Public contact added successfully',
            publicContact:{
                bloodGroup: 2,
                _id: 'fwetiubg43t6847gsdffwekt',
                donorId: 'fwetiubg43t6847gsdffwekt',
            }
        },
        description: 'Success message'
    }
 */
  const insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup)
  if (insertionResult.status !== 'OK') {
    return res.respond(new InternalServerError500(insertionResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST PUBLICCONTACTS', { donorId: req.body.donorId })
  return res.respond(new CreatedResponse201('Public contact added successfully', {
    publicContact: insertionResult.data
  }))
}

/**
 * @openapi
 * /publicContacts:
 *   get:
 *     tags:
 *       - Public Contacts
 *     summary: Get list of public contacts
 *     description: Endpoint to get public contacts
 *     responses:
 *       200:
 *         description: Success message
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
 *                   example: All public contacts fetched successfully
 *                 publicContacts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bloodGroup:
 *                         type: integer
 *                         example: 2
 *                       contacts:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              donorId:
 *                                type: string
 *                                example: 584abcde6744144441
 *                              contactId:
 *                                type: string
 *                                example: 584abcde6744144441
 *                              name:
 *                                type: string
 *                                example: Mir Mahathir Mohammad
 *                              phone:
 *                                type: number
 *                                example: 8801521438557
 */
const handleGETPublicContacts = async (req, res) => {
  /*
#swagger.auto = false
#swagger.tags = ['Public Contacts']
#swagger.description = 'Endpoint to get public contacts'
#swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: "All public contacts fetched successfully",
            publicContacts:[
                {
                    bloodGroup: 2,
                    contacts:[
                        {
                            donorId: 'fwetiubg43t6847gsdffwekt',
                            phone: "8801521438557",
                            name: "Mahathir",
                            contactId: 'fwetiubg43t6847gsdffwekt'
                        }
                    ]
                }
            ]
        },
        description: 'Success message'
    }
*/
  const searchResult = await publicContactInterface.findAllPublicContacts()
  return res.respond(new OKResponse200('All public contacts fetched successfully', {
    publicContacts: searchResult.data
  }))
}
/**
 * @openapi
 * /publicContacts:
 *   delete:
 *     tags:
 *       - Public Contacts
 *     summary: Delete public contact route
 *     security:
 *       - ApiKeyAuth: []
 *     description: Endpoint to delete a public contact
 *     parameters:
 *       - in: query
 *         name: donorId
 *         description: DonorId of public contact
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *       - in: query
 *         name: contactId
 *         description: ContactId of public contact
 *         required: true
 *         schema:
 *           type: string
 *           example: 5e901d56effc590017712345
 *     responses:
 *       200:
 *         description: Success message
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
 *                   example: Public contact deleted successfully
 *       404:
 *         description: Response if the public contact to be deleted is not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Public contact not found
 *       409:
 *         description: If contactId in database does not have the matching donorId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 statusCode:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Public contact not consistent with donorId
 */
const handleDELETEPublicContact = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Public Contacts']
    #swagger.description = 'Endpoint to delete a public contact'
    #swagger.parameters['donorId'] = {
            description: 'donorId of public contact',
            type: 'string',
            name: 'donorId',
            in: 'query'
    }
    #swagger.parameters['contactId'] = {
            description: 'contactId to be deleted',
            type: 'string',
            name: 'contactId',
            in: 'query'
    }
    #swagger.security = [{
               "api_key": []
        }]

    #swagger.responses[404] = {
        schema: {
            status: 'ERROR',
            statusCode: 404,
            message: "Public contact not found"
        },
        description: 'Response if the public contact to be deleted is not found'
    }
    #swagger.responses[409] = {
        schema: {
            status: 'ERROR',
            statusCode: 409,
            message: "Public contact not consistent with donorId"
        },
        description: 'If contactId in database does not have the matching donorId'
    }
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Public contact deleted successfully'
        },
        description: 'Success message'
    }

     */

  const searchResult = await publicContactInterface.findPublicContactById(req.query.contactId)
  if (searchResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Public contact not found'))
  }

  if (!searchResult.data.donorId.equals(req.query.donorId)) {
    return res.respond(new ConflictError409('Public contact not consistent with donorId'))
  }

  const deletionResult = await publicContactInterface.deletePublicContactById(req.query.contactId)
  if (deletionResult.status !== 'OK') {
    return res.respond(new InternalServerError500(deletionResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE PUBLICCONTACTS', { deletedContact: searchResult.data.name })

  return res.respond(new OKResponse200('Public contact deleted successfully'))
}
module.exports = {
  handlePOSTPublicContact,
  handleDELETEPublicContact,
  handleGETPublicContacts
}
