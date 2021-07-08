const callRecordInterface = require('../db/interfaces/callRecordInterface');
const logInterface = require('../db/interfaces/logInterface');

const handlePOSTCallRecord = async (req, res) => {
    /*  #swagger.tags = ['Call Records']
        #swagger.description = 'Endpoint to insert a call record' */
    /* #swagger.parameters['CallRecordObject'] = {
               in: 'body',
               description: 'Contains the donor id of caller and callee',
               schema:{
                    donorId:'fwetiubg43t6847gsdffwekt',
               }
      } */
    try {
        let donor = res.locals.middlewareResponse.targetDonor;
        let user = res.locals.middlewareResponse.donor;
        let callRecordInsertionResult = await callRecordInterface.insertOne({callerId:user._id,calleeId:donor._id});
        if(callRecordInsertionResult.status!=='OK'){
            /* #swagger.responses[500] = {
             schema: {
                    status: 'EXCEPTION',
                    message: '(Internal server error)'
              },
             description: 'This error occurs if the call record insertion fails'
            } */
            return res.status(500).send({
                status: 'EXCEPTION',
                message: callRecordInsertionResult.message
            });
        }
        await logInterface.addLog(user.name,user.hall,"INSERT CALLRECORD",{date: callRecordInsertionResult.data.date});
        /* #swagger.responses[200] = {
                     schema: {
                           status: 'OK',
                           message: 'Call record insertion successful'
                     },
                     description: 'Call record insertion successful'
                } */
        return res.status(200).send({
            status: 'OK',
            message: 'Call record insertion successful',
            callRecord: callRecordInsertionResult.data,
        });
    } catch (e) {
        /* #swagger.responses[500] = {
             schema: {
                    status: 'EXCEPTION',
                    message: '(Internal server error)'
              },
             description: 'In case of internal server error, user will get this error message'
      } */
        return res.status(500).send({
            status: 'EXCEPTION',
            message: e.message
        });
    }
}

module.exports = {
    handlePOSTCallRecord
}
