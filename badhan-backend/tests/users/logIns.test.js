const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('GET/users/logins',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signIn', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });
        let logInsResponse = await badhanAxios.get('/users/logins', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationResult = validate(logInsResponse.data, {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "status": {"type": "string"},
                "statusCode": {"const": 200},
                "message": {"type": "string"},
                "logins": {
                    "type": "array",
                    "items": {
                        "types": "object",
                        additionalProperties: false,
                        "properties": {
                            "_id": {"type": "string"},
                            "os": {"type": "string"},
                            "device": {"type": "string"},
                            "browserFamily": {"type": "string"},
                            "ipAddress": {"type": "string"}
                        }
                    }
                },
                "currentLogin": {
                    "type": "object",
                    additionalProperties: false,
                    "properties": {
                        "_id": {"type": "string"},
                        "os": {"type": "string"},
                        "device": {"type": "string"},
                        "browserFamily": {"type": "string"},
                        "ipAddress": {"type": "string"}
                    }
                }
            },
            "required": ["status", "statusCode", "message", "logins", "currentLogin"]
        });
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    }catch (e) {
        throw processError(e);
    }
})