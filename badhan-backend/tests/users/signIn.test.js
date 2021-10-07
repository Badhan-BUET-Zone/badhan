const api = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;

test('POST/users/signIn',async()=>{
    let response = await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "const": 201 },
            "token": { "type": "string" },
            "message":{"type":"string"}
        },
    });
    expect(validationResult.errors).toEqual([]);
    api.setToken(response.data.token);
})