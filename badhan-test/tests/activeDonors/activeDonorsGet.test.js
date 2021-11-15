const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

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
                    hall: {type: "number"},
                    name: {type: "string"},
                    address: {type: "string"},
                    comment: {type: "string"},
                    commentTime: {type: "number"},
                    lastDonation: {type: "number"},
                    availableToAll: {type: "boolean"},
                    bloodGroup: {type: "number"},
                    studentId: {type: "string"},
                    phone: {type: "number"},
                    markedTime: {type: "number"},
                    markerName: {type: "string"},
                    donationCount: {type: "number"},
                    callRecordCount: {type: "number"},
                    lastCallRecord: {
                        type: {
                            anyOf: [{type: "number"},{type:"null"}],
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

test('GET/activeDonors', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let response = await badhanAxios.get('/activeDonors?bloodGroup=1&hall=5&batch=&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true&markedByMe=false&availableToAllOrHall=false', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let activeDonorSearchValidationResult = validate(response.data, activeDonorSearchResultSchema);


        expect(activeDonorSearchValidationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    } catch (e) {
        throw processError(e);
    }
})
test('GET/guest/activeDonors', async () => {
    try {
        let response = await badhanAxios.get('/guest/activeDonors?bloodGroup=1&hall=5&batch=&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true', {});
        let activeDonorSearchValidationResult = validate(response.data, activeDonorSearchResultSchema);
        expect(activeDonorSearchValidationResult.errors).toEqual([]);
    } catch (e) {
        throw processError(e);
    }
});