const api = require('../../api');
const validate = require('jsonschema').validate;
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('DELETE/users/signOutAll',async()=>{
    let response = await api.handleDELETESignOutAll();
    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "const": 200},
            "message":{"type":"string"}
        },
        "required":["status","statusCode","message"]
    });
    expect(validationResult.errors).toEqual([]);
})