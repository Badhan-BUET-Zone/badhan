const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test.skip('GET/volunteers', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let volunteersResponse = await badhanAxios.get('/volunteers', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let validationResult = validate(volunteersResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode":{type:"number"},
                "message":{type:"string"},
                "volunteerList": {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            "roomNumber":{type:"string"},
                            "_id": {type: "string"},
                            "studentId": {type: "string"},
                            "name": {type: "string"},
                            "bloodGroup": {type: "number"},
                            "phone": {type: "number"},
                        },
                        required: ["roomNumber","_id", "studentId","name", "bloodGroup","phone"]
                    },
                },
            },
            required:["status","statusCode","message","admins"]
        });


        // expect(validationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

    } catch (e) {
        throw processError(e);
    }
})