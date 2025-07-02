import {Request, Response} from 'express'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";
import {IDonor} from "../db/models/Donor";
import {IDonation} from "../db/models/Donation";

const handlePOSTDonations = async (req: Request, res: Response): Promise<Response> => {
  const donor: IDonor = res.locals.middlewareResponse.targetDonor

  const donationInsertionResult: {data: IDonation, message: string, status: string} = await donationInterface.insertDonation(
    donor.phone,
    donor._id,
    req.body.date
  )

  if (donationInsertionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(donationInsertionResult.message,{},{}))
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

const handleDELETEDonations = async (req: Request<{},{},{},{date: string}>, res: Response):Promise<Response> => {
  const donor: IDonor = res.locals.middlewareResponse.targetDonor
  const reqQuery: { date: string } = req.query
  const givenDate: number = parseInt(reqQuery.date,10)

  const donationDeletionResult: {data?: IDonation, message: string, status: string} = await donationInterface.deleteDonationByQuery({
    donorId: donor._id,
    date: givenDate
  })

  if (donationDeletionResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Matching donation not found',{}))
  }

  const maxDonationResult: {data?: IDonation[], message: string, status: string} = await donationInterface.findMaxDonationByDonorId(donor._id)

  if (maxDonationResult.status === 'OK') {
    donor.lastDonation = maxDonationResult.data![0].date
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

const handleGETDonationsReport = async (req: Request<{},{},{},{startDate: string, endDate: string}>, res: Response):Promise<Response> => {
  const reqQuery: {startDate: string, endDate: string} = req.query
  const startTimeStampNumber: number = parseInt(reqQuery.startDate,10)
  const endTimeStampNumber: number = parseInt(reqQuery.endDate,10)

  const reportResult: {data: donationInterface.IDonationCountByBloodGroup[], message: string, status: string} = await donationInterface.getDonationCountByTimePeriod(startTimeStampNumber, endTimeStampNumber)
  const countOfFirstTimeDonationsOfDonors: {data: number, message: string, status: string} = await donorInterface.getCountOfDonorsWhoDonatedForTheFirstTime(startTimeStampNumber, endTimeStampNumber)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET DONATIONS REPORT', {
    ...reportResult.data,
    name: res.locals.middlewareResponse.donor.name
  })

  return res.status(200).send(new OKResponse200(reportResult.message, {
    report: reportResult.data,
    firstDonationCount: countOfFirstTimeDonationsOfDonors.data
  }))
}

export default {
  handlePOSTDonations,
  handleDELETEDonations,
  handleGETDonationsReport
}
