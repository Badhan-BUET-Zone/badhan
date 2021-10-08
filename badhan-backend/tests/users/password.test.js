const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('PATCH/users/password',async()=>{
    let response = await api.handlePATCHUsersPassword({"password":env.MAHATHIR_PASSWORD});
    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "const": 201},
            "message":{"type":"string"},
            "token":{"type":"string"}
        },
        "required":["status","statusCode","token","message"]
    });
    expect(validationResult.errors).toEqual([]);
    api.setToken(response.data.token);
})