const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('GET/admins', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let adminResponse = await badhanAxios.get('/admins', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let validationResult = validate(adminResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode":{const:200},
                "message":{type:"string"},
                "admins": {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            "address":{type:"string"},
                            "roomNumber":{type:"string"},
                            "designation":{type:"number"},
                            "lastDonation":{type:"number"},
                            "comment":{type:"string"},
                            "commentTime":{type:"number"},
                            "donationCount":{type:"number"},
                            "email":{type:"string"},
                            "_id": {type: "string"},
                            "studentId": {type: "string"},
                            "name": {type: "string"},
                            "bloodGroup": {type: "number"},
                            "phone": {type: "number"},
                            "hall": {type: "number"},
                            "availableToAll":{type:"boolean"},
                            "donationCountOptimized":{type:"number"},
                            "callRecords": {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        "_id": {type: "string"},
                                        "callerId": {type: "string"},
                                        "calleeId": {type: "string"},
                                        "date": {type: "number"},
                                        "expireAt": {type: "string"}
                                    },
                                    required: ["callerId", "calleeId","date", "expireAt"]
                                }
                            },
                        },
                        required: ["address","roomNumber","designation","lastDonation","comment","commentTime","donationCount", "email","_id", "studentId","name", "bloodGroup","hall", "phone","availableToAll","donationCountOptimized","callRecords"]
                    },
                },
            },
            required:["status","statusCode","message","admins"]
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