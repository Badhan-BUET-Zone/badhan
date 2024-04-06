import * as donorInterface from '../db/interfaces/donorInterface'
import * as donationInterface from '../db/interfaces/donationInterface'
import * as logInterface from '../db/interfaces/logInterface'
import OKResponse200 from "../response/models/successTypes/OKResponse200";
import InternalServerError500 from "../response/models/errorTypes/InternalServerError500";
import { handleGETGitReleaseInfo } from '../microservices/githubAPI'
import {handleGETFirebaseGooglePlayVersion} from '../microservices/firebaseAPI'
import {validate, Schema, ValidatorResult} from 'jsonschema'
import {Response, Request} from 'express'
import {AxiosResponse} from "axios";
import {ILog} from "../db/models/Log";
import myConsole from '../utils/myConsole';

const githubResponseSchema: Schema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    tag_name: { type: 'string' },
    assets: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          browser_download_url: { type: 'string' }
        },
        required: ['browser_download_url']
      }
    }
  },
  required: ['tag_name']
}

const firebaseResponseSchema: Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    backendBaseURL: { type: 'string' },
    backendTestBaseURL: { type: 'string' },
    version: { type: 'string' }
  },
  required: ['backendBaseURL', 'backendTestBaseURL', 'version']
}

const isValidHttpUrl = (text: string): boolean => {
  let url: URL
  try {
    url = new URL(text)
  } catch (_) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

const isValidVersion = (text: string): boolean => {
  return /^\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(text)
}

const handleGETAppVersions = async (req: Request, res: Response):Promise<Response> => {
  const githubResponse: AxiosResponse = await handleGETGitReleaseInfo()

  const githubValidationResult: ValidatorResult = validate(githubResponse.data, githubResponseSchema)
  if (githubValidationResult.errors.length !== 0) {
    return res.status(500).send(new InternalServerError500('Github API response format not valid',{},{}))
  }
  const browserDownloadURL: string = githubResponse.data.assets[0].browser_download_url
  const githubReleaseVersion: string = githubResponse.data.tag_name

  if (!isValidHttpUrl(browserDownloadURL)) {
    return res.status(500).send(new InternalServerError500('Github release browser download URL is not valid',{},{}))
  }

  const firebaseResponse: AxiosResponse = await handleGETFirebaseGooglePlayVersion()
  const firebaseValidationResult: ValidatorResult = validate(firebaseResponse.data, firebaseResponseSchema)
  if (firebaseValidationResult.errors.length !== 0) {
    return res.status(500).send(new InternalServerError500('Firebase frontendSettings has invalid format',{},{}))
  }
  return res.status(200).send(new OKResponse200('Github and firebase latest app version fetched', {
    githubReleaseVersion,
    githubReleaseDownloadURL: browserDownloadURL,
    firebaseVersion: firebaseResponse.data.version
  }))
}

const handleGETStatistics = async (req: Request, res: Response):Promise<Response> => {
  const donorCount: { message: string; status: string; data: number } = await donorInterface.getCount()
  const donationCount: { message: string; status: string; data: number } = await donationInterface.getCount()
  const volunteerCount: { message: string; status: string; data: number } = await donorInterface.getVolunteerCount()
  return res.status(200).send(new OKResponse200('Statistics fetched successfully', {
    statistics: {
      donorCount: donorCount.data,
      donationCount: donationCount.data,
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
  handleGETAppVersions,
  handleGETLogs,
  handleDELETELogs,
  handleGETLogsDonations
}
