const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError}=require('../fixtures/helpers');
const logInsSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        logins: {
            type: "array",
            minItems: 1,
            items: {
                types: "object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    os: {type: "string"},
                    device: {type: "string"},
                    browserFamily: {type: "string"},
                    ipAddress: {type: "string"}
                }
            }
        },
        currentLogin: {
            type: "object",
            additionalProperties: false,
            properties: {
                _id: {type: "string"},
                os: {type: "string"},
                device: {type: "string"},
                browserFamily: {type: "string"},
                ipAddress: {type: "string"}
            }
        }
    },
    required: ["status", "statusCode", "message", "logins", "currentLogin"]
}

test('GET/users/logins',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signIn', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });
        await badhanAxios.post('/users/signIn', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let logInsResponse = await badhanAxios.get('/users/logins', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationResult = validate(logInsResponse.data, logInsSchema);
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

test('GET/guest/users/logins',async()=>{
    try {
        let logInsResponse = await badhanAxios.get('/guest/users/logins');
        let validationResult = validate(logInsResponse.data, logInsSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})
