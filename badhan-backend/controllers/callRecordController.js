const callRecordInterface = require('../db/interfaces/callRecordInterface');
const logInterface = require('../db/interfaces/logInterface');

const handlePOSTCallRecord = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Call Records']
        #swagger.description = 'Endpoint to insert a call record'
        #swagger.parameters['CallRecordObject'] = {
            in: 'body',
            description: 'Contains the donor id of callee',
            schema: {
                donorId: 'fwetiubg43t6847gsdffwekt',
            }
        }

     */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;
        let user = res.locals.middlewareResponse.donor;
        let callRecordInsertionResult = await callRecordInterface.insertOne(user._id, donor._id);
        if (callRecordInsertionResult.status !== 'OK') {
            /*
                        #swagger.responses[500] = {
                            schema: {
                                status: 'EXCEPTION',
                                message: '(Internal server error)'
                            },
                            description: 'This error occurs if the call record insertion fails'
                        }

             */
            return res.status(500).send({
                status: 'EXCEPTION',
                message: callRecordInsertionResult.message
            });
        }
        await logInterface.addLog(user._id, "CREATE CALLRECORD", {callee: donor.name});
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Call record insertion successful',
                callRecord: {
                    date: 1625755390858,
                    _id: '60e70f42055a83d88',
                    "callerId": {
                        _id: "5e901d56e0177ced73",
                        name: "Mir Mahathir Mohammad",
                        designation: 3,
                        hall: 4
                    },
                    calleeId: "5e68514546b0e",
                }
            },
            description: 'Call record insertion successful'
        }

         */
        return res.status(200).send({
            status: 'OK',
            message: 'Call record insertion successful',
            callRecord: callRecordInsertionResult.data,
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleGETCallRecords = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Call Records']
        #swagger.description = 'handles the retrieval of call history for a particular donor.'
        #swagger.parameters['donorId'] = {
            description: 'donor info for call history',
            type: 'string',
            name: 'donorId'
        }

     */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;
        let callRecordResult = await callRecordInterface.findManyByCallee(donor._id);
        if (callRecordResult.status !== 'OK') {
            return res.status(404).send({
                status: 'ERROR',
                message: "Call records not found"
            });
        }
        /*
                #swagger.responses[200] = {
                    schema: {
                        status: 'OK',
                        message: 'Call record fetch successful',
                        callRecords: {
                            "status": "OK",
                            "message": "Call record fetch successful",
                            "callRecord": [
                                {
                                    "date": 1625754390478,
                                    "_id": "60e70d6972a660d4f156906b",
                                    "callerId": "5e901d56effc5900177ced73",
                                    "calleeId": "5e68514995b0367d81546b0e",
                                },
                            ]
                        }
                    },
                    description: 'Call record fetch successful'
                }

         */


        return res.status(200).send({
            status: 'OK',
            message: 'Call record fetch successful',
            callRecords: callRecordResult.data,
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

const handleDELETESingleCallRecord = async (req, res) => {
    /*
        #swagger.auto = false
        #swagger.tags = ['Call Records']
        #swagger.description = 'handles the deletion of one call history for a particular donor.'
        #swagger.parameters['donorId'] = {
            description: 'Id of donor for call history',
            type: 'string',
            name: 'donorId'
        }
        #swagger.parameters['callRecordId'] = {
            description: 'Id of call record that is going to be deleted ',
            type: 'string',
            name: 'callRecordId'
        }
    */

    let user = res.locals.middlewareResponse.donor;

    try {
        let donor = res.locals.middlewareResponse.targetDonor;
        let callRecordSearchResult = await callRecordInterface.findById(req.query.callRecordId);
        if (callRecordSearchResult.status !== 'OK') {
            /*
            #swagger.responses[404] = {
                schema: {
                    status: 'ERROR',
                    message: 'Call record not found'
                },
                description: 'This error occurs if the call record does not exist'
            }

             */

            return res.status(404).send({
                status: 'ERROR',
                message: 'Call record not found'
            });
        }

        if (!callRecordSearchResult.data.calleeId.equals(donor._id)) {
            /*
            #swagger.responses[400] = {
                schema: {
                    status: 'ERROR',
                    message: 'Target donor does not have the callee of call record'
                },
                description: 'This error occurs if the call record does not associate with the target donor'
            }

             */
            return res.status(400).send({
                status: 'ERROR',
                message: 'Target donor does not have the callee of call record'
            });
        }

        let callRecordDeleteResult = await callRecordInterface.deleteById(req.query.callRecordId);
        if (callRecordDeleteResult.status !== 'OK') {
            return res.status(500).send({
                status: 'EXCEPTION',
                message: callRecordDeleteResult.message
            });
        }

        await logInterface.addLog(user._id, "DELETE CALLRECORD", {
            callee: donor.name,
            deletedDate: new Date(callRecordSearchResult.data.date).toLocaleString()
        });
        /*
        #swagger.responses[200] = {
            schema: {
                status: 'OK',
                message: 'Call record deletion successful',
            },
            description: 'Call record deletion successful'
        }

         */

        return res.status(200).send({
            status: 'OK',
            message: 'Call record deletion successful'
        });
    } catch (e) {
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}


module.exports = {
    handlePOSTCallRecord,
    handleGETCallRecords,
    handleDELETESingleCallRecord
}
