// @ts-nocheck
/* tslint:disable */
const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
import {
  InternalServerError500,
  NotFoundError404
} from '../response/errorTypes'
import { CreatedResponse201, OKResponse200 } from '../response/successTypes'

const handlePOSTDonations = async (req, res) => {
  const donor = res.locals.middlewareResponse.targetDonor

  const donationInsertionResult = await donationInterface.insertDonation({
    phone: donor.phone,
    donorId: donor._id,
    date: req.body.date
  })

  if (donationInsertionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(donationInsertionResult.message))
  }

  if (donor.lastDonation < req.body.date) {
    donor.lastDonation = req.body.date
  }

  await donor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST DONATIONS', {
    ...donationInsertionResult.data,
    donor: donor.name
  })

  return res.status(201).send(new CreatedResponse201('Donation inserted successfully', {
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
    return res.status(404).send(new NotFoundError404('Matching donation not found'))
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

  return res.status(200).send(new OKResponse200('Deleted donation successfully', {
    deletedDonation: donationDeletionResult.data
  }))
}

export default {
  handlePOSTDonations,
  handleDELETEDonations
}
