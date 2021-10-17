const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');

test.skip('POST/users/password/forgot',async()=>{
    try {
        let response = await badhanAxios.post("/users/password/forgot", {phone: "8801521438557"});
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