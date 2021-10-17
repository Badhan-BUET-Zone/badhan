const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('GET/search/v2', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let searchResponse = await badhanAxios.get('/search/v2?bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        console.log(searchResponse.data)

        let validationResult = validate(searchResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode":{const:200},
                "message":{type:"string"},
                "filteredDonors": {
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
                                    },
                                    required: ["callerId", "calleeId","date","_id"]
                                }
                            },
                        },
                        required: ["address","roomNumber","designation","lastDonation","comment","commentTime","_id", "studentId","name", "bloodGroup","hall", "phone","availableToAll","donationCountOptimized","callRecords"]
                    },
                },
            },
            required:["status","statusCode","message","filteredDonors"]
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