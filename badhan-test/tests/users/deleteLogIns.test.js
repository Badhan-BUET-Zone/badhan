const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('DELETE/users/logins/{tokenId}',async()=>{
    // console.log("delete/user/logins token-> "+api.getToken());
    let user=await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    api.setToken(user.data.token);
    let logins = await api.handleGETLogins();
    // console.log(logins.data.currentLogin["_id"]);
    console.log(logins.data)
    // let response = await api.handleDELETELogins({"tokenId":logins.data.cogin["_id"]});
    // console.log(response);
    // let validationResult = validate(response.data, {
    //     "type": "object",
    //     "additionalProperties":false,
    //     "properties": {
    //         "status":{"type":"string"},
    //         "statusCode": { "const": 200},
    //         "message":{"type":"string"}
    //     },
    // "required":["status","statusCode","token","message"]
    // });
    // console.log(validationResult.errors);
    // expect(validationResult.errors).toEqual([]);
})