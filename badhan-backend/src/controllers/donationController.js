const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const {
  InternalServerError500,
  NotFoundError404
} = require('../response/errorTypes')
const { CreatedResponse201, OKResponse200 } = require('../response/successTypes')

const handlePOSTDonations = async (req, res) => {
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

const handleDELETEDonations = async (req, res) => {
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
