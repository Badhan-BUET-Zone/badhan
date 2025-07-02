const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');

const randomComment = `Developer of Badhan ${new Date().getTime()}`

const patchCommentSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: { type: "string"},
    },
    required: ["status", "statusCode", "message"]
}
const getCommentSchema = {
    type: "object",
    properties: {
        donor: {
            type: "object",
            properties: {
                comment:{const: randomComment},
            },
            required: ["comment"]
        }
    },
    required: ["donor"]
}

test('PATCH/donors/comment', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorResponse = await badhanAxios.get('/users/me', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let response = await badhanAxios.patch('/donors/comment', {
            donorId: donorResponse.data.donor._id,
            comment: randomComment
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let commentPatchValidationResult = validate(response.data, patchCommentSchema);

        expect(commentPatchValidationResult.errors).toEqual([]);

        let getCommentResponse = await badhanAxios.get('/donors?donorId=' + donorResponse.data.donor._id, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let commentGetValidationResult = validate(getCommentResponse.data, getCommentSchema);

        expect(commentGetValidationResult.errors).toEqual([]);

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
