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
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    address: {type: "string"},
                    roomNumber: {type: "string"},
                    lastDonation: {type: "integer"},
                    comment: {type: "string"},
                    commentTime: {type: "integer"},
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    name: {type: "string"},
                    bloodGroup: {type: "integer"},
                    phone: {type: "integer"},
                    hall: {type: "integer"},
                    availableToAll: {type: "boolean"},
                    donationCount: {type: "integer"},
                    callRecordCount: {type: "integer"},
                    lastCalled: {
                        type:{
                            anyOf: [
                                {
                                    type: "integer",
                                },
                                {
                                    type: "null"
                                }
                            ]
                        },
                    },
                    marker: {
                        type:{
                            anyOf: [
                                {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        name:{type:"string",},
                                        time: {type: "integer"},
                                    },
                                    required: ["name", "time"]
                                },
                                {
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                    },
                                }
                            ]
                        },
                    }
                },
                required: ["address", "roomNumber", "lastDonation", "comment", "commentTime", "_id", "studentId", "name", "bloodGroup", "hall", "phone", "availableToAll", "donationCount", "callRecordCount", "marker"]
            },
        },
    },
    required: ["status", "statusCode", "message", "filteredDonors"]
}

test('GET/search/v3', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let searchResponse = await badhanAxios.get('/search/v3?bloodGroup=2&hall=5&batch=16&name=maha&address=&isAvailable=true&isNotAvailable=true&availableToAll=true', {
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

test('GET/guest/search/v3', async () => {
    try {
        let searchResponse = await badhanAxios.get('/guest/search/v3?bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true');

        let validationResult = validate(searchResponse.data, searchSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})