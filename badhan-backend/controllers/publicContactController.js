const publicContactInterface = require('../db/interfaces/publicContactInterface');
const logInterface = require('../db/interfaces/logInterface');

const handleDELETEPublicContact = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Public Contacts']
    #swagger.description = 'Endpoint to delete a public contact'
    #swagger.parameters['PublicContactObject'] = {
        in: 'body',
        description: 'Contains the contact id and donor Id',
        schema: {
            donorId: 'fwetiubg43t6847gsdffwekt',
            contactId: 'fwetiubg43t6847gsdffwekt',
        }
    }

     */
    try {
        let searchResult = await publicContactInterface.findPublicContactById(req.query.contactId);
        if(searchResult.status!=="OK"){
            return res.status(404).send({
                status: 'ERROR',
                message: "Public contact not found"
            });
        }

        if(!searchResult.data.donorId.equals(req.query.donorId)){
            return res.status(400).send({
                status: 'ERROR',
                message: "Public contact not consistent with donorId"
            });
        }

        let deletionResult = await publicContactInterface.deletePublicContactById(req.query.contactId);
        if (deletionResult.status !== "OK") {
            return res.status(404).send({
                status: 'EXCEPTION',
                message: e.message
            });
        }
        return res.status(200).send({
            status: 'OK',
            message: 'Public contact deleted successfully'
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }

}

const handlePOSTPublicContact = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Public Contacts']
    #swagger.description = 'Endpoint to insert a public contact'
    #swagger.parameters['PublicContactObject'] = {
        in: 'body',
        description: 'Contains the donor id and assigned bloodgroup of contact',
        schema: {
            donorId: 'fwetiubg43t6847gsdffwekt',
            bloodGroup: 2
        }
    }
 */
    try {
        let insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup);
        if (insertionResult.status !== "OK") {
            return res.status(500).send({
                status: 'EXCEPTION',
                message: insertionResult.message
            });
        }
        return res.status(201).send({
            status: 'OK',
            message: 'Public contact added successfully',
            publicContact: insertionResult.data
        })
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleGETPublicContacts  = async (req, res) => {
    try{
        let searchResult = await publicContactInterface.findAllPublicContacts();
        return res.status(200).send({
            status: 'OK',
            message: "All public contacts fetched successfully",
            publicContacts: searchResult.data,
        })
    }catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


module.exports = {
    handlePOSTPublicContact,
    handleDELETEPublicContact,
    handleGETPublicContacts
}
