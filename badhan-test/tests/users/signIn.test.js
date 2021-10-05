const api = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;

beforeEach(() => {
});
afterEach(() => {
})
test('POST /users/signIn',async()=>{
    let response = await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD})

    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "type": "number" },
            "token": { "type": "string" },
            "message":{"type":"string"}
        },
    });
    expect(validationResult.errors).toEqual([]);
})