const api = require('../../api');
const validate = require('jsonschema').validate;
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('DELETE/users/logins/{tokenId}',async()=>{
    let logins = await api.handleGETLogins();
    console.log(logins.data);
    // let response = await api.handleDELETELogins();
    // console.log(response);
    // let validationResult = validate(response.data, {
    //     "type": "object",
    //     "additionalProperties":false,
    //     "properties": {
    //         "status":{"type":"string"},
    //         "statusCode": { "const": 200},
    //         "message":{"type":"string"}
    //     },
    // });
    // console.log(validationResult.errors);
    // expect(validationResult.errors).toEqual([]);
})