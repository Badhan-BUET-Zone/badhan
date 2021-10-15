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

        let contactCreationResponse = await badhanAxios.post("/publicContacts",{
            "donorId":env.DONOR_ID,
            "bloodGroup":2
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationContactResult = validate(contactCreationResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 201},
                "message": {type: "string"},
                // "publicContact": {
                //     type: "object",
                //     additionalProperties: false,
                //     properties:{
                //         "bloodGroup":{type:"number"},
                //         "_id":{type:"string"},
                //         "donorId":{type:"string"}
                //     },
                //     required:["bloodGroup","_id","donorId"]
                // }
            },
            required: ["status", "statusCode", "message"
                //, "publicContact"
            ]
        });

        expect(validationContactResult.errors).toEqual([]);

        // delete/donations part

        // let donationDeletionResponse = await badhanAxios.delete("/callrecords?donorId="+env.DONOR_ID+"&callRecordId="+recordCreationResponse.data.callRecord["_id"],  {
        //     headers: {
        //         "x-auth": signInResponse.data.token
        //     }
        // });
        //
        // let validationResult = validate(donationDeletionResponse.data, {
        //     type: "object",
        //     additionalProperties: false,
        //     properties: {
        //         "status": {type: "string"},
        //         "statusCode": {const: 200},
        //         "message": {type: "string"},
        //         "deletedCallRecord": {
        //             type: "object",
        //             additionalProperties: false,
        //             properties:{
        //                 "date":{type:"number"},
        //                 "_id":{type:"string"},
        //                 "callerId":{type:"string"},
        //                 "calleeId":{type:"string"},
        //                 "expireAt":{type:"string"}
        //             },
        //             required:["date","_id","callerId","calleeId"]
        //         }
        //     },
        //     required: ["status", "statusCode", "message","deletedCallRecord"]
        // });
        // expect(validationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

    } catch (e) {
        throw processError(e);
    }
})