const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('GET/donors/designation', async() => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let designationResponse = await badhanAxios.get('/donors/designation', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        console.log(designationResponse.data);

        let validationResult = validate(designationResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode":{const:200},
                "message":{type:"string"},
                "found":{type:"boolean"},
                "donor": {
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
                        "phone": {type: "number"},
                        "bloodGroup": {type: "number"},
                        "hall": {type: "number"},
                        "name": {type: "string"},
                        "availableToAll":{type:"boolean"},
                    },
                    required: ["address","roomNumber","designation","lastDonation","comment","commentTime","donationCount", "email","_id", "studentId","phone","bloodGroup","hall","name","availableToAll"]
                },
            },
            required:["status","statusCode","message","donor"]
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