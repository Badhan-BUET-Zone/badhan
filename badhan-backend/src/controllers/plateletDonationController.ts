import {Request, Response} from 'express'
import * as plateletDonationInterface from '../db/interfaces/plateletDonationInterface'
import * as donorInterface from '../db/interfaces/donorInterface'
import * as logInterface from '../db/interfaces/logInterface'
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import NotFoundError404 from "../response/models/errorTypes/NotFoundError404";
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import CreatedResponse201 from "../response/models/successTypes/CreatedResponse201";
import {IDonor} from "../db/models/Donor";
import {IPlateletDonation} from "../db/models/PlateletDonation";

const handlePOSTPlateletDonations = async (req: Request, res: Response): Promise<Response> => {
  const donor: IDonor = res.locals.middlewareResponse.targetDonor

  const plateletDonationInsertionResult: {data: IPlateletDonation, message: string, status: string} = await plateletDonationInterface.insertPlateletDonation(
    donor.phone,
    donor._id,
    req.body.date
  )

  if (plateletDonationInsertionResult.status !== 'OK') {
    return res.status(500).send(new InternalServerError500(plateletDonationInsertionResult.message,{},{}))
  }

  if (donor.lastPlateletDonation < req.body.date) {
    donor.lastPlateletDonation = req.body.date
  }

  await donor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'POST PLATELET DONATIONS', {
    ...plateletDonationInsertionResult.data,
    donor: donor.name
  })

  return res.status(201).send(new CreatedResponse201('Platelet donation inserted successfully', {
    newPlateletDonation: plateletDonationInsertionResult.data
  }))
}

const handleDELETEPlateletDonations = async (req: Request<{},{},{},{date: string}>, res: Response):Promise<Response> => {
  const donor: IDonor = res.locals.middlewareResponse.targetDonor
  const reqQuery: { date: string } = req.query
  const givenDate: number = parseInt(reqQuery.date,10)

  const plateletDonationDeletionResult: {data?: IPlateletDonation, message: string, status: string} = await plateletDonationInterface.deletePlateletDonationByQuery({
    donorId: donor._id,
    date: givenDate
  })

  if (plateletDonationDeletionResult.status !== 'OK') {
    return res.status(404).send(new NotFoundError404('Matching platelet donation not found',{}))
  }

  const latestPlateletDonationResult: {data?: IPlateletDonation[], message: string, status: string} = await plateletDonationInterface.findLatestPlateletDonationByDonorId(donor._id)

  if (latestPlateletDonationResult.status === 'OK' && latestPlateletDonationResult.data && latestPlateletDonationResult.data.length > 0) {
    donor.lastPlateletDonation = latestPlateletDonationResult.data[0].date
  } else {
    donor.lastPlateletDonation = 0
  }

  await donor.save()

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE PLATELET DONATIONS', {
    ...plateletDonationDeletionResult.data,
    name: donor.name
  })

  return res.status(200).send(new OKResponse200('Deleted platelet donation successfully', {
    deletedPlateletDonation: plateletDonationDeletionResult.data
  }))
}

const handleGETPlateletDonationsReport = async (req: Request<{},{},{},{startDate: string, endDate: string}>, res: Response):Promise<Response> => {
  const reqQuery: {startDate: string, endDate: string} = req.query
  const startTimeStampNumber: number = parseInt(reqQuery.startDate,10)
  const endTimeStampNumber: number = parseInt(reqQuery.endDate,10)

  const reportResult: {data: plateletDonationInterface.IPlateletDonationCountByBloodGroup[], message: string, status: string} = await plateletDonationInterface.getPlateletDonationCountByTimePeriod(startTimeStampNumber, endTimeStampNumber)
  const countOfFirstTimePlateletDonationsOfDonors: {data: number, message: string, status: string} = await donorInterface.getCountOfDonorsWhoDonatedPlateletForTheFirstTime(startTimeStampNumber, endTimeStampNumber)

  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'GET PLATELET DONATIONS REPORT', {
    ...reportResult.data,
    name: res.locals.middlewareResponse.donor.name
  })

  return res.status(200).send(new OKResponse200(reportResult.message, {
    report: reportResult.data,
    firstPlateletDonationCount: countOfFirstTimePlateletDonationsOfDonors.data
  }))
}

export default {
  handlePOSTPlateletDonations,
  handleDELETEPlateletDonations,
  handleGETPlateletDonationsReport
}
