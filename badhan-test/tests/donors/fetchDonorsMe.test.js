const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('GET/donors/me', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorResponse = await badhanAxios.get('/donors/me', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donorResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"},
                donor: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        _id:{type:"string"},
                        phone: {type: "number"},
                        name:{type:"string"},
                        studentId:{type:"string"},
                        email:{type:"string"},
                        lastDonation: {type: "number"},
                        donationCount: {type: "number"},
                        bloodGroup: {type: "number"},
                        hall: {type: "number"},
                        roomNumber:{type:"string"},
                        address:{type:"string"},
                        comment:{type:"string"},
                        commentTime:{type:"number"},
                        designation: {type: "number"},
                        availableToAll: {type: "boolean"},
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
                                    expireAt: {type: "string"}
                                },
                                required: ["callerId", "calleeId","date", "expireAt"]
                            }
                        },
                        donations: {
                            type: "array",
                            items: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    _id: {type: "string"},
                                    donorId: {type: "string"},
                                    phone: {type: "number"},
                                    date: {type: "number"}
                                },
                                required: ["_id", "donorId","phone", "date"]
                            }
                        },
                    },
                    required: ["_id", "phone","name","studentId","email","lastDonation","bloodGroup","hall","roomNumber","address","comment","commentTime","designation","availableToAll","donations","callRecords"]
                },
            },
            required: ["status", "statusCode", "message", "donor"]
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