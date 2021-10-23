const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const patchCommentSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
    },
    required: ["status", "statusCode", "message"]
}

test('PATCH/donors/comment', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let response = await badhanAxios.patch('/donors/comment', {
            donorId:env.SUPERADMIN_ID,
            comment:"Developer of Badhan"
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(response.data, patchCommentSchema);

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


test('PATCH/donors/comment', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let response = await badhanAxios.patch('/donors/comment', {
            donorId:env.SUPERADMIN_ID,
            comment:"Developer of Badhan"
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(response.data, patchCommentSchema);

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


test('PATCH/guest/donors/comment', async () => {
    try {

        let response = await badhanAxios.patch('/guest/donors/comment');

        let validationResult = validate(response.data, patchCommentSchema);

        expect(validationResult.errors).toEqual([]);
    } catch (e) {
        throw processError(e);
    }
})