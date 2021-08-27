const donorInterface = require('../db/interfaces/donorInterface');
const donationInterface = require('../db/interfaces/donationInterface');
const logInterface = require('../db/interfaces/logInterface');
let gplay = require('google-play-scraper');

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
    gplay.app({appId: 'com.mmmbadhan'})
        .then((response) => {
            /*
            #swagger.responses[200] = {
                schema: {
                    version: '(App information fetched from google play store)'
                },
                description: 'response is the current version number of badhan api'
            }

             */
            res.status(200).send(response)
        });
}

const handleDELETELogs = async (req, res, next) => {
    /*
    #swagger.auto = false
        #swagger.tags = ['Logs']
        #swagger.description = 'handles the deletion of logs.'
    */
    try {
        let allLogData = await logInterface.deleteLogs();
        /* #swagger.responses[200] = {
             schema: {
               status: 'OK',
               message: 'All logs deleted successfully',
               logs:[
                   {
                        "_id": "fdogirehognrebk",
                        name: "Mit Majumder",
                        hall: 2,
                        date: 1622090693113,
                        editedObject: {
                            _id: "60af292680015defd72",
                            address: "Mohammadpur",
                            bloodGroup: 2,
                            comment: "This is a comment",
                            designation: 0,
                            donationCount: 0,
                            hall: 8,
                            lastDonation: 1622073600000,
                            name: "Md. Rafat Hossain ",
                            phone: 8801521347889,
                            roomNumber: "TH-3012",
                            studentId: 1516256,
                        },
                        operation: "EDIT COMMENT"
                    },
                ]
              },
             description: 'All logs deleted successfully'
      } */
        return res.status(200).send({
            status: 'OK',
            message: 'All logs deleted successfully',
            logs: allLogData.data
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        })
    }
};

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
    handleDELETELogs,
    handleGETLogsByDate,
    handleGETLogsByDateAndDonor
}
