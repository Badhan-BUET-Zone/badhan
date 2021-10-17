const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('POST/donors/password', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let response = await badhanAxios.post('/donors/password', {
            donorId:env.DONOR_ID
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(response.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"},
                token:{type:"string"}
            },
            required: ["status", "statusCode", "message","token"]
        });

        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": response.data.token
            }
        });
    } catch (e) {
        throw processError(e);
    }
})