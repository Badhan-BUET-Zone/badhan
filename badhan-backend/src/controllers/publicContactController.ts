import {Request, Response} from 'express'
import * as publicContactInterface from '../db/interfaces/publicContactInterface'
import * as logInterface from '../db/interfaces/logInterface'

import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";

const handlePOSTPublicContact = async (req: Request, res: Response) => {
  const insertionResult = await publicContactInterface.insertPublicContact(req.body.donorId, req.body.bloodGroup)
  if (insertionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(insertionResult.message,{},{}))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST PUBLICCONTACTS', { donorId: req.body.donorId })
  return res.status(201).send(new CreatedResponse201('Public contact added successfully', {
    publicContact: insertionResult.data
  }))
}

const handleGETPublicContacts = async (req: Request, res: Response) => {
  const searchResult = await publicContactInterface.findAllPublicContacts()
  return res.status(200).send(new OKResponse200('All public contacts fetched successfully', {
    publicContacts: searchResult.data
  }))
}

const handleDELETEPublicContact = async (req: Request<{},{},{},{contactId: string}>, res: Response) => {
  const targetDonor = res.locals.middlewareResponse.donor
  const searchResult = await publicContactInterface.findPublicContactById(req.query.contactId)
  if (searchResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Public contact not found',{}))
  }
  const deletionResult = await publicContactInterface.deletePublicContactById(req.query.contactId)
  if (deletionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(deletionResult.message,{},{}))
  }

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE PUBLICCONTACTS', { deletedContact: targetDonor.name })

  return res.status(200).send(new OKResponse200('Public contact deleted successfully',{}))
}
export default {
  handlePOSTPublicContact,
  handleDELETEPublicContact,
  handleGETPublicContacts
}
