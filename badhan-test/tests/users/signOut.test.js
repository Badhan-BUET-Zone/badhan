const api = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;

test('DELETE/users/signOut',async()=>{
    let user = await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    let response = await api.handleDELETESignOut(user.data.token)
    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "type": "number" },
            "message":{"type":"string"}
        },
    });
    expect(validationResult.errors).toEqual([]);
})