// @ts-nocheck
/* tslint:disable */
const activeDonorInterface = require('../db/interfaces/activeDonorInterface')
const logInterface = require('../db/interfaces/logInterface')
// const util = require('util')

import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import ConflictError409 from "../response/models/errorTypes/ConflictError409";
import ForbiddenError403 from "../response/models/errorTypes/ForbiddenError403";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";
const handlePOSTActiveDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor
  const user = res.locals.middlewareResponse.donor

  const activeDonorSearch = await activeDonorInterface.findByDonorId(donor._id)
  if (activeDonorSearch.status === 'OK') {
    return res.status(409).send(new ConflictError409('Active donor already created'))
  }

  const activeDonorInsertResult = await activeDonorInterface.add(donor._id, user._id)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST ACTIVEDONORS', {
    ...activeDonorInsertResult.data,
    donor: donor.name
  })
  return res.status(201).send(new CreatedResponse201('Active donor created', {
    newActiveDonor: activeDonorInsertResult.data
  }))
}

const handleDELETEActiveDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor

  const activeDonorRemoveResult = await activeDonorInterface.remove(donor._id)
  if (activeDonorRemoveResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Active donor not found'))
  }
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE ACTIVEDONORS', {
    ...activeDonorRemoveResult.data,
    donor: donor.name
  })
  return res.status(200).send(new OKResponse200('Active donor deleted successfully', {
    removedActiveDonor: activeDonorRemoveResult.data
  }))
}

const handleGETActiveDonors = async (req, res) => {
  const reqQuery = req.query

  if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall &&
    reqQuery.hall <= 6 &&
    res.locals.middlewareResponse.donor.designation !== 3) {
    return res.status(403).send(new ForbiddenError403('You are not allowed to search donors of other halls'))
  }
  const activeDonors = await activeDonorInterface.findByQueryAndPopulate(reqQuery, res.locals.middlewareResponse.donor._id)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET ACTIVEDONORS', {
    filter: reqQuery,
    resultCount: activeDonors.data.length
  })
  return res.status(200).send(new OKResponse200('Active donor queried successfully', {
    activeDonors: activeDonors.data
  }))
}

export default {
  handlePOSTActiveDonors,
  handleDELETEActiveDonors,
  handleGETActiveDonors
}
