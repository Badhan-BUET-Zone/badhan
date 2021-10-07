const api = require('../../api');
const validate = require('jsonschema').validate;
const {authenticate}=require('../fixtures/authToken')

beforeEach(authenticate);

test('GET/users/logins',async()=>{
    let response = await api.handleGETLogins();
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
                    "properties":{
                        "_id":{"type":"string"},
                        "os":{"type":"string"},
                        "device":{"type":"string"},
                        "browserFamily":{"type":"string"},
                        "ipAddress":{"type":"string"}
                    }
                }
            },
            currentLogins:{
                "type":"object",
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
    console.log(validationResult.errors);
    expect(validationResult.errors).toEqual([]);
})