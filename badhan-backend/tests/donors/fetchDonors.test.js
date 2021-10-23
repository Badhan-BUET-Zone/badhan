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
                phone: {type: "number"},
                name:{type:"string"},
                studentId:{type:"string"},
                email:{type:"string"},
                lastDonation: {type: "number"},
                bloodGroup: {type: "number"},
                hall: {type: "number"},
                roomNumber:{type:"string"},
                address:{type:"string"},
                comment:{type:"string"},
                commentTime: {type: "number"},
                designation: {type: "number"},
                availableToAll: {type: "boolean"},
                callRecords: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            _id: {type: "string"},
                            callerId: {
                                type: "object",
                                additionalProperties:false,
                                properties:{
                                    designation:{type:"number"},
                                    _id:{type:"string"},
                                    name:{type:"string"},
                                    hall:{type:"number"},
                                },
                                required:["designation","_id","name","hall"]
                            },
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
                publicContacts: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            bloodGroup: {type: "number"},
                            _id: {type: "string"},
                            donorId: {type: "string"}
                        },
                        required: ["_id", "bloodGroup","donorId"]
                    }
                }
            },
            required: ["_id", "phone","name","studentId","email","lastDonation","bloodGroup","hall","roomNumber","address","comment","commentTime","designation","availableToAll","callRecords","donations","publicContacts"]
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