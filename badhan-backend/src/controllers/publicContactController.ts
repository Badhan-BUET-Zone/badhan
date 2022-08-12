// @ts-nocheck
const publicContactInterface = require('../db/interfaces/publicContactInterface')
const logInterface = require('../db/interfaces/logInterface')
const {
  InternalServerError500,
  NotFoundError404,
  ConflictError409
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

const handlePOSTPublicContact = async (req, res) => {
  const insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup)
  if (insertionResult.status !== 'OK') {
    return res.respond(new InternalServerError500(insertionResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST PUBLICCONTACTS', { donorId: req.body.donorId })
  return res.respond(new CreatedResponse201('Public contact added successfully', {
    publicContact: insertionResult.data
  }))
}

const handleGETPublicContacts = async (req, res) => {
  const searchResult = await publicContactInterface.findAllPublicContacts()
  return res.respond(new OKResponse200('All public contacts fetched successfully', {
    publicContacts: searchResult.data
  }))
}

const handleDELETEPublicContact = async (req, res) => {
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
