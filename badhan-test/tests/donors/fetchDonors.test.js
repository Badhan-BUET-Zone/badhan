const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
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

        let donorResponse = await badhanAxios.get('/users/me', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let newDonationResult = await badhanAxios.post('/donations',{
            donorId: donorResponse.data.donor._id,
            date: 1611100800000
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let recordCreationResponse = await badhanAxios.post("/callrecords",{
            donorId: donorResponse.data.donor._id,
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let contactCreationResponse = await badhanAxios.post("/publicContacts",{
            donorId: donorResponse.data.donor._id,
            bloodGroup:2
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let donorsResponse = await badhanAxios.get('/donors?donorId=' + donorResponse.data.donor._id, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let validationResult = validate(donorsResponse.data, donorsSchema);

        expect(validationResult.errors).toEqual([]);

        //clean up
        await badhanAxios.delete("/donations?donorId="+donorResponse.data.donor._id+"&date="+1611100800000,  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        await badhanAxios.delete("/callrecords?donorId="+donorResponse.data.donor._id+"&callRecordId="+recordCreationResponse.data.callRecord["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        await badhanAxios.delete("/publicContacts?donorId="+donorResponse.data.donor._id+"&contactId="+contactCreationResponse.data.publicContact["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


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
        let donorsResponse = await badhanAxios.get('/guest/donors?donorId=123456');

        let validationResult = validate(donorsResponse.data, donorsSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
