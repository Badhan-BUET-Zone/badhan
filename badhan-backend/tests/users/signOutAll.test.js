const api = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;

test('DELETE/users/signOut',async()=>{
    let user = await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    api.setToken(user.data.token);
    let response = await api.handleDELETESignOutAll();
    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "const": 200},
            "message":{"type":"string"}
        },
    });
    expect(validationResult.errors).toEqual([]);
})