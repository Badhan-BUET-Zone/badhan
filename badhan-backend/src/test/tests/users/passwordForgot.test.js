const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');
const env = require('../../config');
// test('POST/users/password/forgot',async()=>{
test.skip('POST/users/password/forgot',async()=>{
    try {
        let response = await badhanAxios.post("/users/password/forgot", {phone: env.SUPERADMIN_PHONE});
        let validationResult = validate(response.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"}
            },
            required: ["status", "statusCode", "message"]
        });
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})
