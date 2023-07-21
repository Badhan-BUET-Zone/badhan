const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const duplicateDonorSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode:{const:200},
        message:{type:"string"},
        found:{type:"boolean"},
        donor: {
            type: "object" ,
            additionalProperties: false,
            properties: {
                address:{type:"string"},
                roomNumber:{type:"string"},
                designation:{type:"integer"},
                lastDonation:{type:"integer"},
                comment:{type:"string"},
                commentTime:{type:"integer"},
                email:{type:"string"},
                _id: {type: "string"},
                studentId: {type: "string"},
                phone: {type: "integer"},
                bloodGroup: {type: "integer"},
                hall: {type: "integer"},
                name: {type: "string"},
                availableToAll:{type:"boolean"},
            },
            required: ["address","roomNumber","designation","lastDonation","comment","commentTime", "email","_id", "studentId","phone","bloodGroup","hall","name","availableToAll"]
        },
    },
    required: ["status","statusCode","message","donor","found"]
}

test('GET/donors/checkDuplicate', async() => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let duplicateResponse = await badhanAxios.get(`/donors/checkDuplicate?phone=${env.SUPERADMIN_PHONE}`, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(duplicateResponse.data, duplicateDonorSchema);

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

test('GET/guest/donors/checkDuplicate', async() => {
    try {
        let duplicateResponse = await badhanAxios.get('/guest/donors/checkDuplicate?phone=8801521438557');

        let validationResult = validate(duplicateResponse.data, duplicateDonorSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
