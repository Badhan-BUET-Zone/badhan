const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
const {
    InternalServerError500,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    TooManyRequestsError,
    ErrorResponse,
    ConflictError409
} = require('../response/errorTypes')
const {CreatedResponse,OKResponse} = require('../response/successTypes');

const handleGETOnlineCheck = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'To show current state of the api'
        #swagger.responses[200] = {
            schema: {
                message: 'Badhan API is online'
            },
            description: 'To check if Badhan api is online'
        }

     */
    return res.respond(new OKResponse("Badhan API is online"));
}

const handleGETStatistics = async (req, res, next) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Fetch statistics about the current donor count and volunteer count'
    #swagger.security = [{
               "api_key": []
        }]
    */
    let donorCount = await donorInterface.getCount();
    let donationCount = await donationInterface.getCount();
    let volunteerCount = await donorInterface.getVolunteerCount();
    /*
    #swagger.responses[201] = {
        schema: {
            status: 'OK',
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
    return res.respond('Statistics fetched successfully',{
        donorCount: donorCount.data,
        donationCount: donationCount.data,
        volunteerCount: volunteerCount.data
    })
}

const handleGETAppVersion = (req, res, next) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Get app info deployed to play store'
    */

    /*
            #swagger.responses[200] = {
                schema: {
                    version: '(App information fetched from google play store)'
                },
                description: 'response is the current version number of badhan api'
            }
*/
    return res.respond(new OKResponse("Latest app version fetched",{
        version: "4.5.0"
    }))
}

const handleGETLogs = async (req, res, next) => {
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

    let logCountsResult = await logInterface.getLogCounts();
    return res.respond(new OKResponse('Log counts fetched successfully',{
        logs: logCountsResult.data
    }))
};

const handleGETLogsByDate = async (req, res, next) => {
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
                message: 'Donor deleted successfully',
                "logs": [
                    {
                        "name": "Mir Mahathir Mohammad",
                        "donorId": "5e901d56effc5900177ced73",
                        "hall": 5,
                        "count": 32
                    }
                ]
            }
        }
    */
    let logsByDateResult = await logInterface.getLogsByDate(req.params.date);
    return res.respond(new OKResponse("Logs fetched by date successfully",{
        logs: logsByDateResult.data
    }));
}

const handleGETLogsByDateAndDonor = async (req, res, next) => {
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
    let logsByDateAndDonor = await logInterface.getLogsByDateAndUser(req.params.date, req.params.donorId)
    return res.respond(new OKResponse("Logs fetched by data and donor successfully",{
        logs: logsByDateAndDonor.data
    }))
}

module.exports = {
    handleGETStatistics,
    handleGETOnlineCheck,
    handleGETAppVersion,
    handleGETLogs,
    handleGETLogsByDate,
    handleGETLogsByDateAndDonor
}
