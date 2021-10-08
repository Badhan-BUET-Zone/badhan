const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {authenticate}=require('../fixtures/authToken')

// beforeEach(authenticate);

test('DELETE/users/signOut',async()=>{
    console.log('logout');
    let response1 = await api.badhanAxios.post('/users/signin',{phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    console.log("signout "+response1.data.token);
    let response = await api.badhanAxios.delete('/users/signout');
    console.log(response.data);
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