const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError}=require('../fixtures/helpers');

const postActiveDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        newActiveDonor:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"integer"},
            }
        }
    }
}


const deleteActiveDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        removedActiveDonor:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"integer"},
            }
        }
    }
}

const activeDonorSearchResultSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        activeDonors: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    hall: {type: "integer"},
                    name: {type: "string"},
                    address: {type: "string"},
                    comment: {type: "string"},
                    commentTime: {type: "integer"},
                    lastDonation: {type: "integer"},
                    availableToAll: {type: "boolean"},
                    bloodGroup: {type: "integer"},
                    studentId: {type: "string"},
                    phone: {type: "integer"},
                    markedTime: {type: "integer"},
                    markerName: {type: "string"},
                    donationCount: {type: "integer"},
                    callRecordCount: {type: "integer"},
                    lastCallRecord: {
                        type: {
                            anyOf: [{type: "integer"},{type:"null"}],
                        }
                    }
                },
                required: [
                    "_id", "hall", "name", "address", "comment", "commentTime", "lastDonation", "availableToAll", "bloodGroup", "studentId", "phone", "markedTime", "markerName", "donationCount", "callRecordCount", "lastCallRecord",
                ]
            }
        }
    },
    required: ["status", "statusCode", "message", "activeDonors"]
}

test('POST & DELETE /activeDonors',async()=>{
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

        // clear up any existing active donor to begin testing
        try{
            await badhanAxios.delete(`/activeDonors/${donorResponse.data.donor._id}`, {
                headers: {
                    "x-auth": signInResponse.data.token
                }
            });
        }catch (e) {

        }

        let createActiveDonorResponse = await badhanAxios.post('/activeDonors',{
            donorId: donorResponse.data.donor._id,
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let createActiveDonorValidationResult = validate(createActiveDonorResponse.data, postActiveDonorSchema);

        expect(createActiveDonorValidationResult.errors).toEqual([]);

        let getActiveDonorResponse = await badhanAxios.get(`/activeDonors?bloodGroup=-1&hall=${donorResponse.data.donor.hall}&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=false&markedByMe=false&availableToAllOrHall=false`, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let activeDonorSearchValidationResult = validate(getActiveDonorResponse.data, activeDonorSearchResultSchema);

        expect(activeDonorSearchValidationResult.errors).toEqual([]);

        let deleteActiveDonorResponse = await badhanAxios.delete(`/activeDonors/${donorResponse.data.donor._id}`, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let deleteActiveDonorValidateResult = validate(deleteActiveDonorResponse.data,deleteActiveDonorSchema);
        expect(deleteActiveDonorValidateResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    }catch (e) {
        throw processError(e);
    }
});
test('POST & DELETE /guest/activeDonors',async()=>{
    try {
        let createActiveDonorResponse = await badhanAxios.post('/guest/activeDonors',{
        },{
        })

        let createActiveDonorValidationResult = validate(createActiveDonorResponse.data, postActiveDonorSchema);

        expect(createActiveDonorValidationResult.errors).toEqual([]);

        let deleteActiveDonorResponse = await badhanAxios.delete(`/guest/activeDonors/123456`, {
        });

        let deleteActiveDonorValidateResult = validate(deleteActiveDonorResponse.data,deleteActiveDonorSchema);
        expect(deleteActiveDonorValidateResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
});

