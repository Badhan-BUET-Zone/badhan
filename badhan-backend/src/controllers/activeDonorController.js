const activeDonorInterface = require('../db/interfaces/activeDonorInterface')
const logInterface = require('../db/interfaces/logInterface')
// const util = require('util')
const {
  NotFoundError404,
  ConflictError409,
  ForbiddenError403
} = require('../response/errorTypes')
const { OKResponse200, CreatedResponse201 } = require('../response/successTypes')

const handlePOSTActiveDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor
  const user = res.locals.middlewareResponse.donor

  const activeDonorSearch = await activeDonorInterface.findByDonorId(donor._id)
  if (activeDonorSearch.status === 'OK') {
    return res.respond(new ConflictError409('Active donor already created'))
  }

  const activeDonorInsertResult = await activeDonorInterface.add(donor._id, user._id)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST ACTIVEDONORS', {
    ...activeDonorInsertResult.data,
    donor: donor.name
  })
  return res.respond(new CreatedResponse201('Active donor created', {
    newActiveDonor: activeDonorInsertResult.data
  }))
}

const handleDELETEActiveDonors = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor

  const activeDonorRemoveResult = await activeDonorInterface.remove(donor._id)
  if (activeDonorRemoveResult.status !== 'OK') {
    return res.respond(new NotFoundError404('Active donor not found'))
  }
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE ACTIVEDONORS', {
    ...activeDonorRemoveResult.data,
    donor: donor.name
  })
  return res.respond(new OKResponse200('Active donor deleted successfully', {
    removedActiveDonor: activeDonorRemoveResult.data
  }))
}

const handleGETActiveDonors = async (req, res) => {
  const reqQuery = req.query

  if (reqQuery.hall !== res.locals.middlewareResponse.donor.hall &&
    reqQuery.hall <= 6 &&
    res.locals.middlewareResponse.donor.designation !== 3) {
    return res.respond(new ForbiddenError403('You are not allowed to search donors of other halls'))
  }
  const activeDonors = await activeDonorInterface.findByQueryAndPopulate(reqQuery, res.locals.middlewareResponse.donor._id)
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET ACTIVEDONORS', {
    filter: reqQuery,
    resultCount: activeDonors.data.length
  })
  return res.respond(new OKResponse200('Active donor queried successfully', {
    activeDonors: activeDonors.data
  }))
}

module.exports = {
  handlePOSTActiveDonors,
  handleDELETEActiveDonors,
  handleGETActiveDonors
}
