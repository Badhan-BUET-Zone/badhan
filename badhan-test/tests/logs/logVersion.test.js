const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('GET/log/version',async()=>{
    try {

        let logVersionResponse = await badhanAxios.get('/log/version');
        let validationResult = validate(logVersionResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 200},
                "message": {type: "string"},
                "version":{type:"string"}
            },
            required: ["status", "statusCode", "message", "version"]
        });
        expect(validationResult.errors).toEqual([]);

    }catch (e) {
        throw processError(e);
    }
})