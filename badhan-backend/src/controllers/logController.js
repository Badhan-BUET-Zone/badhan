const donorInterface = require('../db/interfaces/donorInterface')
const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const { OKResponse200 } = require('../response/successTypes')
const constants = require('../constants')
const { ForbiddenError403, InternalServerError500 } = require('../response/errorTypes')
const githubAPI = require('../microservices/githubAPI')
const firebaseAPI = require('../microservices/firebaseAPI')

const handleGETOnlineCheck = async (req, res) => {
  return res.respond(new OKResponse200('Badhan API is online'))
}

const handleGETAppVersions = async (req, res) => {
  const githubResponse = await githubAPI.handleGETGitReleaseInfo()
  if (githubResponse.status !== 200) {
    return new InternalServerError500('Failed to connect to github API')
  }
  let browserDownloadURL, githubReleaseVersion
  try {
    browserDownloadURL = githubResponse.data.assets[0].browser_download_url
    githubReleaseVersion = githubResponse.data.tag_name
    if (!browserDownloadURL || !githubReleaseVersion || githubReleaseVersion.split('.').length !== 3) {
      return res.respond(new InternalServerError500('Browser download URL/ version not properly formatted'))
    }
  } catch (e) {
    return res.respond(new InternalServerError500('Browser download URL/ version not found from github releases'))
  }
  const firebaseResponse = await firebaseAPI.handleGETFirebaseGooglePlayVersion()
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
  handleGETOnlineCheck,
  handleGETAppVersions,
  handleGETLogs,
  handleGETLogsByDate,
  handleGETLogsByDateAndDonor,
  handleDELETELogs
}
