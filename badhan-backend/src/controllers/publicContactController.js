const publicContactInterface = require('../db/interfaces/publicContactInterface')
const logInterface = require('../db/interfaces/logInterface')
const {
  InternalServerError500,
  NotFoundError404,
  ConflictError409
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

const handleDELETEPublicContact = async (req, res, next) => {
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

     */

  /*
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

const handlePOSTPublicContact = async (req, res, next) => {
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

const handleGETPublicContacts = async (req, res, next) => {
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

module.exports = {
  handlePOSTPublicContact,
  handleDELETEPublicContact,
  handleGETPublicContacts
}
