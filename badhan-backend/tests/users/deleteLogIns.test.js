const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const deleteLogInsSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"}
    },
    required: ["status", "statusCode", "message"]
}

test('DELETE /users/logins/{tokenId}', async () => {
    try {
        let loginResult = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });
        let loginResults = await badhanAxios.get('/users/logins', {
            headers: {
                'x-auth': loginResult.data.token
            }
        });
        let currentLoginId = loginResults.data.currentLogin["_id"];
        let deleteResponse = await badhanAxios.delete('/users/logins/' + currentLoginId, {
            headers: {
                'x-auth': loginResult.data.token
            }
        });
        let validationResult = validate(deleteResponse.data,deleteLogInsSchema);
        expect(validationResult.errors).toEqual([]);
    } catch (e) {
        throw processError(e);
    }
})


test('DELETE /guest/users/logins/{tokenId}', async () => {
    try {

        let deleteResponse = await badhanAxios.delete('/guest/users/logins/abc' );
        let validationResult = validate(deleteResponse.data,deleteLogInsSchema);
        expect(validationResult.errors).toEqual([]);
    } catch (e) {
        throw processError(e);
    }
})