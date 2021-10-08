const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {authenticate}=require('../fixtures/authToken')

// beforeEach(authenticate);

test('GET/users/logins',async()=>{
    let response1 = await api.handlePOSTSignIn({phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
    api.setToken(response1.data.token);
    console.log("inside get logins");
    let response = await api.handleGETLogins();
    // console.log(response);

    let validationResult = validate(response.data, {
        "type": "object",
        "additionalProperties":false,
        "properties": {
            "status":{"type":"string"},
            "statusCode": { "const": 200},
            "message":{"type":"string"},
            "logins":{
                "type":"array",
                "items":{
                    "types":"object",
                    additionalProperties:false,
                    "properties":{
                        "_id":{"type":"string"},
                        "os":{"type":"string"},
                        "device":{"type":"string"},
                        "browserFamily":{"type":"string"},
                        "ipAddress":{"type":"string"}
                    }
                }
            },
            "currentLogin":{
                "type":"object",
                additionalProperties:false,
                "properties":{
                    "_id":{"type":"string"},
                    "os":{"type":"string"},
                    "device":{"type":"string"},
                    "browserFamily":{"type":"string"},
                    "ipAddress":{"type":"string"}
                }
            }
        },
        "required":["status","statusCode","message","logins","currentLogin"]
    });
    expect(validationResult.errors).toEqual([]);
})