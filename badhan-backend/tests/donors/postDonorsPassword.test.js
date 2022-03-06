const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const passwordSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        token:{type:"string"}
    },
    required: ["status", "statusCode", "message","token"]
}

test('POST/donors/password', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let response = await badhanAxios.post('/donors/password', {
            donorId:env.SUPERADMIN_ID
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(response.data, passwordSchema);

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

test('POST/guest/donors/password', async () => {
    try {

        let response = await badhanAxios.post('/guest/donors/password');

        let validationResult = validate(response.data, passwordSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
