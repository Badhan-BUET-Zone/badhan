const donorInterface = require('../db/interfaces/donorInterface')
const donationInterface = require('../db/interfaces/donationInterface')
const logInterface = require('../db/interfaces/logInterface')
const { OKResponse200 } = require('../response/successTypes')
const constants = require('../constants')
const { ForbiddenError403 } = require('../response/errorTypes')

const handleGETOnlineCheck = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'To show current state of the api'
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: 'Badhan API is online'
            },
            description: 'To check if Badhan api is online'
        }

     */
  return res.respond(new OKResponse200('Badhan API is online'))
}

const handleGETStatistics = async (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Fetch statistics about the current donor count and volunteer count'
    #swagger.security = [{
               "api_key": []
        }]
        #swagger.responses[200] = {
        schema: {
            status: 'OK',
            statusCode: 200,
            message: 'Statistics fetched successfully',
            statistics: {
                donorCount: 2600,
                donationCount: 1200,
                volunteerCount: 130
            }
        },
        description: 'Donation statistics fetch successful'
    }
    */
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

/**
 * @openapi
 * /log/version:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get info about current version
 *     description: Get app info deployed to play store
 *     responses:
 *       200:
 *         description: Response is the current version number of badhan api
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Latest app version fetched
 *                 version:
 *                   type: string
 *                   example: '2.5.1'
 */
const handleGETAppVersion = (req, res) => {
  /*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Get app info deployed to play store'

            #swagger.responses[200] = {
                schema: {
                    status:'OK',
                    statusCode: 200,
                    version: '2.5.1',
                    message: "Latest app version fetched",
                },
                description: 'response is the current version number of badhan api'
            }
*/
  return res.respond(new OKResponse200('Latest app version fetched', {
    version: '4.5.2'
  }))
}

/**
 * @openapi
 * /log:
 *   get:
 *     tags:
 *       - Logs
 *     summary: Get count of logged in user and logs
 *     security:
 *       - ApiKeyAuth: []
 *     description: Get date wise count of api calls
 *     responses:
 *       200:
 *         description: Log counts fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Log counts fetched successfully
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dateString:
 *                         type: string
 *                         example: 2021-05-06
 *                       activeUserCount:
 *                         type: number
 *                         example: 23
 *                       totalLogCount:
 *                         type: number
 *                         example: 256
 */
const handleGETLogs = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Get date wise count of api calls'
        #swagger.security = [{
               "api_key": []
        }]
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: 'Donor deleted successfully',
                "logs": [
                    {
                        "dateString": "2021-08-14",
                        "count": 2
                    },
                ]
            }
        }
    */

  const logCountsResult = await logInterface.getLogCounts()
  return res.respond(new OKResponse200('Log counts fetched successfully', {
    logs: logCountsResult.data
  }))
}

const handleGETLogsByDate = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Get user-wise api call counts for specific date'
        #swagger.security = [{
               "api_key": []
        }]
        #swagger.parameters['date'] = {
            description: 'Date of logs',
            type: 'number',
            name: 'date',
            in: 'param'
        }
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                statusCode: 200,
                message: 'Donor deleted successfully',
                "logs": [
                    {
                        "name": "Mir Mahathir Mohammad",
                        "donorId": "5e901d56effc590017712345",
                        "hall": 5,
                        "count": 32
                    }
                ]
            }
        }
    */
  const logsByDateResult = await logInterface.getLogsByDate(req.params.date)
  return res.respond(new OKResponse200('Logs fetched by date successfully', {
    logs: logsByDateResult.data
  }))
}

const handleGETLogsByDateAndDonor = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Get api call details of a donor by date'
        #swagger.security = [{
                   "api_key": []
            }]
        #swagger.parameters['date'] = {
            description: 'Date of logs',
            type: 'number',
            name: 'date',
            in: 'param'
        }
        #swagger.parameters['donorId'] = {
            description: 'donorId of the target donor',
            type: 'string',
            name: 'donorId',
            in: 'param'
        }
        #swagger.responses[200] = {
            schema: {
                "status": "OK",
                "statusCode":200,
                "message": "Logs fetched by user and date",
                "logs": [
                    {
                        "_id": "611559f87be47bc8ca89b8a1",
                        "date": 1628789240641,
                        "operation": "SEARCH DONORS",
                        "details": {
                        }
                    }
                ],
            }
        }
        #swagger.security = [{
                   "api_key": []
            }]
    */
  const logsByDateAndDonor = await logInterface.getLogsByDateAndUser(req.params.date, req.params.donorId)
  return res.respond(new OKResponse200('Logs fetched by data and donor successfully', {
    logs: logsByDateAndDonor.data
  }))
}

const handleDELETELogs = async (req, res) => {
  /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Delete all logs'
        #swagger.security = [{
                   "api_key": []
            }]
        #swagger.responses[200] = {
            schema: {
                "status": "OK",
                "statusCode":200,
                "message": "All logs deleted successfully",
            }
        }
        #swagger.security = [{
                   "api_key": []
            }]
    */
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
  handleGETAppVersion,
  handleGETLogs,
  handleGETLogsByDate,
  handleGETLogsByDateAndDonor,
  handleDELETELogs
}
