const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('GET/donors/checkDuplicate', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let duplicateResponse = await badhanAxios.get('/donors/checkDuplicate?phone=8801521438557', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        console.log(duplicateResponse.data);

        let validationResult = validate(duplicateResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode":{type:"number"},
                "message":{type:"string"},
                "data": {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            "_id": {type: "string"},
                            "studentId": {type: "string"},
                            "name": {type: "string"},
                            "logCount": {type: "number"},
                            "hall": {type: "number"},
                        },
                        required: ["_id", "studentId","name", "logCount","hall"]
                    },
                },
            },
            required:["status","statusCode","message","data"]
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