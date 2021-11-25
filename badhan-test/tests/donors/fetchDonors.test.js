const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const donorsSchema={
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
                phone: {type: "integer"},
                name:{type:"string"},
                studentId:{type:"string"},
                email:{type:"string"},
                lastDonation: {type: "integer"},
                bloodGroup: {type: "integer"},
                hall: {type: "integer"},
                roomNumber:{type:"string"},
                address:{type:"string"},
                comment:{type:"string"},
                commentTime: {type: "integer"},
                designation: {type: "integer"},
                availableToAll: {type: "boolean"},
                callRecords: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            _id: {type: "string"},
                            callerId: {
                                type: "object",
                                additionalProperties:false,
                                properties:{
                                    designation:{type:"integer"},
                                    _id:{type:"string"},
                                    name:{type:"string"},
                                    hall:{type:"integer"},
                                },
                                required:["designation","_id","name","hall"]
                            },
                            calleeId: {type: "string"},
                            date: {type: "integer"},
                            expireAt: {type: "string"}
                        },
                        required: ["callerId", "calleeId","date", "expireAt"]
                    }
                },
                donations: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            _id: {type: "string"},
                            donorId: {type: "string"},
                            phone: {type: "integer"},
                            date: {type: "integer"}
                        },
                        required: ["_id", "donorId","phone", "date"]
                    }
                },
                publicContacts: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            bloodGroup: {type: "integer"},
                            _id: {type: "string"},
                            donorId: {type: "string"}
                        },
                        required: ["_id", "bloodGroup","donorId"]
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
                                    time: {type: "integer"},
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
            required: ["_id", "phone","name","studentId","email","lastDonation","bloodGroup","hall","roomNumber","address","comment","commentTime","designation","availableToAll","callRecords","donations","publicContacts","markedBy"]
        },
    },
    required: ["status", "statusCode", "message", "donor"]
}


test('GET/donors', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorsResponse = await badhanAxios.get('/donors?donorId=' + env.SUPERADMIN_ID, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let validationResult = validate(donorsResponse.data, donorsSchema);

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

test('GET/guest/donors', async () => {
    try {
        let donorsResponse = await badhanAxios.get('/guest/donors?donorId=' + env.SUPERADMIN_ID);

        let validationResult = validate(donorsResponse.data, donorsSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})