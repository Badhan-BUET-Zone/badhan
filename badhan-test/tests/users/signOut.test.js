const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers')
test('DELETE/users/signOut', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signIn',{phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
        let signOutResponse = await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationResult = validate(signOutResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 200},
                "message": {type: "string"}
            },
            required: ["status", "statusCode", "message"]
        });
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})