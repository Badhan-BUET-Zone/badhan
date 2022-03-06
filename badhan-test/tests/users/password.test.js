const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError}=require('../fixtures/helpers');
const patchPasswordSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        token: {type: "string"}
    },
    required: ["status", "statusCode", "token", "message"]
}

test('PATCH/users/password', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });
        let passwordResponse = await badhanAxios.patch("/users/password", {
            "password": env.SUPERADMIN_PASSWORD
        }, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationResult = validate(passwordResponse.data, patchPasswordSchema);
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

test('PATCH/guest/users/password', async () => {
    try {
        let passwordResponse = await badhanAxios.patch("/guest/users/password");
        let validationResult = validate(passwordResponse.data, patchPasswordSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})
