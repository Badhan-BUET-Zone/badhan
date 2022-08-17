// @ts-nocheck
/* tslint:disable */
const publicContactInterface = require('../db/interfaces/publicContactInterface')
const logInterface = require('../db/interfaces/logInterface')
import {
  InternalServerError500,
  NotFoundError404,
  ConflictError409
} from '../response/errorTypes'
import { CreatedResponse201, OKResponse200 } from '../response/successTypes'

const handlePOSTPublicContact = async (req, res) => {
  const insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup)
  if (insertionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(insertionResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST PUBLICCONTACTS', { donorId: req.body.donorId })
  return res.status(201).send(new CreatedResponse201('Public contact added successfully', {
    publicContact: insertionResult.data
  }))
}

const handleGETPublicContacts = async (req, res) => {
  const searchResult = await publicContactInterface.findAllPublicContacts()
  return res.status(200).send(new OKResponse200('All public contacts fetched successfully', {
    publicContacts: searchResult.data
  }))
}

const handleDELETEPublicContact = async (req, res) => {
  const searchResult = await publicContactInterface.findPublicContactById(req.query.contactId)
  if (searchResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Public contact not found'))
  }

  if (!searchResult.data.donorId.equals(req.query.donorId)) {
    return res.status(409).send(new ConflictError409('Public contact not consistent with donorId'))
  }

  const deletionResult = await publicContactInterface.deletePublicContactById(req.query.contactId)
  if (deletionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(deletionResult.message))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE PUBLICCONTACTS', { deletedContact: searchResult.data.name })

  return res.status(200).send(new OKResponse200('Public contact deleted successfully'))
}
module.exports = {
  handlePOSTPublicContact,
  handleDELETEPublicContact,
  handleGETPublicContacts
}
