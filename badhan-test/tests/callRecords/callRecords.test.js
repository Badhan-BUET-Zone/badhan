const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('POST&DELETE/callrecords', async () => {
    try {

        //post/callrecords part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let recordCreationResponse = await badhanAxios.post("/callrecords",{
            "donorId":env.DONOR_ID,
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationRecordResult = validate(recordCreationResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 200},
                "message": {type: "string"},
                "callRecord": {
                    type: "object",
                    additionalProperties: false,
                    properties:{
                        "date":{type:"number"},
                        "_id":{type:"string"},
                        "callerId":{type:"string"},
                        "calleeId":{type:"string"},
                        "expireAt":{type:"string"}
                    },
                    required:["date","_id","callerId","calleeId","expireAt"]
                }
            },
            required: ["status", "statusCode", "message", "callRecord"]
        });

        expect(validationRecordResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/callrecords?donorId="+env.DONOR_ID+"&callRecordId="+recordCreationResponse.data.callRecord["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donationDeletionResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 200},
                "message": {type: "string"},
                "deletedCallRecord": {
                    type: "object",
                    additionalProperties: false,
                    properties:{
                        "date":{type:"number"},
                        "_id":{type:"string"},
                        "callerId":{type:"string"},
                        "calleeId":{type:"string"},
                        "expireAt":{type:"string"}
                    },
                    required:["date","_id","callerId","calleeId"]
                }
            },
            required: ["status", "statusCode", "message","deletedCallRecord"]
        });
        expect(validationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

    } catch (e) {
        throw processError(e);
    }
})