const api = require('../../api');
const validate = require('jsonschema').validate;
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('GET/users/logins',async()=>{
    let response = await api.handleGETLogins();
    console.log(response);
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
            "currentLogins":{
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
    });
    expect(validationResult.errors).toEqual([]);
})