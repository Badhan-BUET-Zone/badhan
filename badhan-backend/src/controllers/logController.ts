import * as donorInterface from '../db/interfaces/donorInterface'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as logInterface from '../db/interfaces/logInterface'
import * as plateletDonationInterface from '../db/interfaces/plateletDonationInterface'
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import {Response, Request} from 'express'
import {ILog} from "../db/models/Log";

const handleGETStatistics = async (req: Request, res: Response):Promise<Response> => {
  const donorCount: { message: string; status: string; data: number } = await donorInterface.getCount()
  const donationCount: { message: string; status: string; data: number } = await donationInterface.getCount()
  const plateletDonationCount: { message: string; status: string; data: number } = await plateletDonationInterface.getPlateletDonationCount()
  const volunteerCount: { message: string; status: string; data: number } = await donorInterface.getVolunteerCount()
  return res.status(200).send(new OKResponse200('Statistics fetched successfully', {
    statistics: {
      donorCount: donorCount.data,
      donationCount: donationCount.data,
      plateletDonationCount: plateletDonationCount.data,
      volunteerCount: volunteerCount.data
    }
  }))
}

const handleGETLogs = async (req: Request, res: Response):Promise<Response> => {
  const logsResult: { data: ILog[]; status: string; message: string } = await logInterface.getLogs()
  return res.status(200).send(new OKResponse200('Logs fetched successfully', {
    logs: logsResult.data
  }))
}

const handleDELETELogs = async (req: Request, res: Response):Promise<Response>  => {
  await logInterface.deleteLogs()
  await logInterface.addLog(res.locals.middlewareResponse.donor._id, 'DELETE LOGS', {})
  return res.status(200).send(new OKResponse200('All logs deleted successfully',{}))
}

const handleGETLogsDonations = async (req: Request, res: Response):Promise<Response>  => {
  const donationYearMonthCountResult:{message: string, status: string, data: donationInterface.YearMonthCount} = await donationInterface.getDonationCountGroupedByYear()
  return res.status(200).send(new OKResponse200(donationYearMonthCountResult.message,{countByYearMonth: donationYearMonthCountResult.data}))
}

export default {
  handleGETStatistics,
  handleGETLogs,
  handleDELETELogs,
  handleGETLogsDonations
}
