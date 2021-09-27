const publicContactInterface = require('../db/interfaces/publicContactInterface');
const logInterface = require('../db/interfaces/logInterface');
const {
    InternalServerError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    ConflictError
} = require('../response/errorTypes')
const {CreatedResponse,OKResponse} = require('../response/successTypes');

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
            message: "Public contact not found"
        },
        description: 'Response if the public contact to be deleted is not found'
    }
    #swagger.responses[400] = {
        schema: {
            status: 'ERROR',
            message: "Public contact not consistent with donorId"
        },
        description: 'If contactId in database does not have the matching donorId'
    }
    #swagger.responses[200] = {
        schema: {
            status: 'OK',
            message: 'Public contact deleted successfully'
        },
        description: 'Success message'
    }

     */

    let searchResult = await publicContactInterface.findPublicContactById(req.query.contactId);
    if (searchResult.status !== "OK") {
        return res.respond(new NotFoundError("Public contact not found"));
    }

    if (!searchResult.data.donorId.equals(req.query.donorId)) {
        return res.respond(new ConflictError("Public contact not consistent with donorId"));
    }

    let deletionResult = await publicContactInterface.deletePublicContactById(req.query.contactId);
    if (deletionResult.status !== "OK") {
        return res.respond(new InternalServerError(deletionResult.message));
    }

    return res.respond(new OKResponse('Public contact deleted successfully'));
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
    let insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup);
    if (insertionResult.status !== "OK") {
        return res.respond(new InternalServerError(insertionResult.message));
    }

    return res.respond(new CreatedResponse('Public contact added successfully'),{
        publicContact: insertionResult.data
    })
}

const handleGETPublicContacts = async (req, res, next) => {
    /*
#swagger.auto = false
#swagger.tags = ['Public Contacts']
#swagger.description = 'Endpoint to get public contacts'
#swagger.responses[200] = {
        schema: {
            status: 'OK',
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
    let searchResult = await publicContactInterface.findAllPublicContacts();
    return res.respond(new OKResponse("All public contacts fetched successfully",{
        publicContacts: searchResult.data,
    }))
}


module.exports = {
    handlePOSTPublicContact,
    handleDELETEPublicContact,
    handleGETPublicContacts
}
