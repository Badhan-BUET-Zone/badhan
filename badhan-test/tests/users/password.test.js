const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('PATCH/users/password', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });
        let passwordResponse = await badhanAxios.patch("/users/password", {
            "password": env.MAHATHIR_PASSWORD
        }, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationResult = validate(passwordResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 201},
                message: {type: "string"},
                token: {type: "string"}
            },
            required: ["status", "statusCode", "token", "message"]
        });
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": passwordResponse.data.token
            }
        });
    }catch (e) {
        throw processError(e);
    }
})