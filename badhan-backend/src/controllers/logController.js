const donorInterface = require('../db/interfaces/donorInterface')
const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const { OKResponse200 } = require('../response/successTypes')
const constants = require('../constants')
const { ForbiddenError403, InternalServerError500 } = require('../response/errorTypes')
const githubAPI = require('../microservices/githubAPI')
const firebaseAPI = require('../microservices/firebaseAPI')

const validate = require('jsonschema').validate

const githubResponseSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    tag_name: { type: 'string' },
    assets: {
      type: 'array',
      minItems: 1,
      items: {
        types: 'object',
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

const firebaseResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    backendBaseURL: { type: 'string' },
    backendTestBaseURL: { type: 'string' },
    version: { type: 'string' }
  },
  required: ['backendBaseURL', 'backendTestBaseURL', 'version']
}

function isValidHttpUrl (string) {
  let url
  try {
    url = new URL(string)
  } catch (_) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function isValidVersion (string) {
  return /^\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(string)
}

const handleGETAppVersions = async (req, res) => {
  const githubResponse = await githubAPI.handleGETGitReleaseInfo()

  const githubValidationResult = validate(githubResponse.data, githubResponseSchema)
  if (githubValidationResult.errors.length !== 0) {
    return res.respond(new InternalServerError500('Github API response format not valid'))
  }
  const browserDownloadURL = githubResponse.data.assets[0].browser_download_url
  const githubReleaseVersion = githubResponse.data.tag_name

  if (!isValidHttpUrl(browserDownloadURL) || !isValidVersion(githubReleaseVersion)) {
    return res.respond(new InternalServerError500('Github release browser download URL/ version is not valid'))
  }

  const firebaseResponse = await firebaseAPI.handleGETFirebaseGooglePlayVersion()
  const firebaseValidationResult = validate(firebaseResponse.data, firebaseResponseSchema)
  if (firebaseValidationResult.errors.length !== 0 || !isValidVersion(firebaseResponse.data.version)) {
    return res.respond(new InternalServerError500('Firebase frontendSettings has invalid format'))
  }
  return res.respond(new OKResponse200('Github and firebase latest app version fetched', {
    githubReleaseVersion: githubReleaseVersion,
    githubReleaseDownloadURL: browserDownloadURL,
    firebaseVersion: firebaseResponse.data.version
  }))
}

const handleGETStatistics = async (req, res) => {
  const donorCount = await donorInterface.getCount()
  const donationCount = await donationInterface.getCount()
  const volunteerCount = await donorInterface.getVolunteerCount()
  return res.respond(new OKResponse200('Statistics fetched successfully', {
    statistics: {
      donorCount: donorCount.data,
      donationCount: donationCount.data,
      volunteerCount: volunteerCount.data
    }
  }))
}

const handleGETLogs = async (req, res) => {
  const logCountsResult = await logInterface.getLogCounts()
  return res.respond(new OKResponse200('Log counts fetched successfully', {
    logs: logCountsResult.data
  }))
}

const handleGETLogsByDate = async (req, res) => {
  const logsByDateResult = await logInterface.getLogsByDate(req.params.date)
  return res.respond(new OKResponse200('Logs fetched by date successfully', {
    logs: logsByDateResult.data
  }))
}
const handleGETLogsByDateAndDonor = async (req, res) => {
  const logsByDateAndDonor = await logInterface.getLogsByDateAndUser(req.params.date, req.params.donorId)
  return res.respond(new OKResponse200('Logs fetched by data and donor successfully', {
    logs: logsByDateAndDonor.data
  }))
}

const handleDELETELogs = async (req, res) => {
  if (!res.locals.middlewareResponse.donor._id.equals(constants.MASTER_ADMIN_ID)) {
    return res.respond(new ForbiddenError403('Only Master Admin is allowed to access this route'))
  }
  await logInterface.deleteLogs()
  await logInterface.addLogOfMasterAdmin('DELETE LOGS', {})
  return res.respond(new OKResponse200('All logs deleted successfully'))
}

module.exports = {
  handleGETStatistics,
  handleGETAppVersions,
  handleGETLogs,
  handleGETLogsByDate,
  handleGETLogsByDateAndDonor,
  handleDELETELogs
}
