const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('POST&PATCH/users/redirection', async () => {
    try {

        //post/users/redirection part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });
        let redirectionResponse = await badhanAxios.post("/users/redirection",{},{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationRedirectionResult = validate(redirectionResponse.data, {
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

        expect(validationRedirectionResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        // patch/users/redirection part

        let redirectionToWebResponse = await badhanAxios.patch("/users/redirection",  {
            "token": redirectionResponse.data.token
        });
        let validationResult = validate(redirectionToWebResponse.data, {
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
                "x-auth": redirectionToWebResponse.data.token
            }
        });

    }catch (e) {
        throw processError(e);
    }
})