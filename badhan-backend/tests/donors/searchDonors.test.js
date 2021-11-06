const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const searchSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        filteredDonors: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    address: {type: "string"},
                    roomNumber: {type: "string"},
                    designation: {type: "number"},
                    lastDonation: {type: "number"},
                    comment: {type: "string"},
                    commentTime: {type: "number"},
                    email: {type: "string"},
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    name: {type: "string"},
                    bloodGroup: {type: "number"},
                    phone: {type: "number"},
                    hall: {type: "number"},
                    availableToAll: {type: "boolean"},
                    donationCountOptimized: {type: "number"},
                    callRecords: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                _id: {type: "string"},
                                callerId: {type: "string"},
                                calleeId: {type: "string"},
                                date: {type: "number"},
                            },
                            required: ["callerId", "calleeId", "date", "_id"]
                        }
                    },
                    markedBy: {
                        type:{
                            anyOf: [
                                {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        markerId:{
                                            type:"object",
                                            additionalProperties: false,
                                            required: ["_id", "name"],
                                            properties: {
                                                _id:{type:"string"},
                                                name:{type:"name"},
                                            }
                                        },
                                        donorId:{type:"string",},
                                        time: {type: "number"},
                                    },
                                    required: ["markerId", "time","donorId"]
                                },
                                {
                                    type: "null",
                                }
                            ]
                        },
                    }
                },
                required: ["address", "roomNumber", "designation", "lastDonation", "comment", "commentTime", "email", "_id", "studentId", "name", "bloodGroup", "hall", "phone", "availableToAll", "donationCountOptimized", "callRecords", "markedBy"]
            },
        },
    },
    required: ["status", "statusCode", "message", "filteredDonors"]
}

test('GET/search/v2', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let searchResponse = await badhanAxios.get('/search/v2?bloodGroup=2&hall=5&batch=16&name=maha&address=&isAvailable=true&isNotAvailable=true&availableToAll=true', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(searchResponse.data, searchSchema);

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

test('GET/guest/search/v2', async () => {
    try {
        let searchResponse = await badhanAxios.get('/guest/search/v2?bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true');

        let validationResult = validate(searchResponse.data, searchSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})