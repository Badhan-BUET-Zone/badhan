const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const donorSchema={
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
                commentTime:{type:"integer"},
                designation: {type: "integer"},
                availableToAll: {type: "boolean"},
            },
            required: ["_id", "phone","name","studentId","email","lastDonation","bloodGroup","hall","roomNumber","address","comment","commentTime","designation","availableToAll"]
        },
    },
    required: ["status", "statusCode", "message", "donor"]
}

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

        let validationResult = validate(donorResponse.data, donorSchema);
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

test('GET/guest/donors/me', async () => {
    try {

        let donorResponse = await badhanAxios.get('/guest/donors/me');
        let validationResult = validate(donorResponse.data, donorSchema);
        expect(validationResult.errors).toEqual([]);
    } catch (e) {
        throw processError(e);
    }
})