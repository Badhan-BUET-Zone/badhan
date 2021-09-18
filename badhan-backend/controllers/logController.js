const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');

const handleGETOnlineCheck = async (req, res) => {
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
    return res.status(200).send("Badhan API is online")
}

const handleGETStatistics = async (req, res) => {
    /*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Fetch statistics about the current donor count and volunteer count'
    */
    try {
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
        return res.status(200).send({
            status: 'OK',
            message: 'Statistics fetched successfully',
            statistics: {
                donorCount: donorCount.data,
                donationCount: donationCount.data,
                volunteerCount: volunteerCount.data
            }
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
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
    res.status(200).send({
        version:"4.5.0"
    })
}

const handleGETLogs = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Get date wise count of api calls'
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

    try {
        let logCountsResult = await logInterface.getLogCounts();
        return res.status(200).send({
            status: 'OK',
            message: logCountsResult.message,
            logs: logCountsResult.data
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
};

const handleGETLogsByDate = async (req, res, next) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'Get user-wise api call counts for specific date'
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
    try {
        let logsByDateResult = await logInterface.getLogsByDate(req.params.date);
        return res.status(200).send({
            status: 'OK',
            message: "Logs fetched by date successfully",
            logs: logsByDateResult.data
        })
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

const handleGETLogsByDateAndDonor = async (req, res, next) => {
/*
    #swagger.auto = false
    #swagger.tags = ['Logs']
    #swagger.description = 'Get api call details of a donor by date'
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
*/
    try {
        let logsByDateAndDonor = await logInterface.getLogsByDateAndUser(req.params.date, req.params.donorId)
        return res.status(200).send({
            status: 'OK',
            message: logsByDateAndDonor.message,
            logs: logsByDateAndDonor.data
        })
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
}

module.exports = {
    handleGETStatistics,
    handleGETOnlineCheck,
    handleGETAppVersion,
    handleGETLogs,
    handleGETLogsByDate,
    handleGETLogsByDateAndDonor
}
