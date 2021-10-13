const api = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers')

test('POST/users/signIn',async()=>{
    try{
        let signInResponse = await api.badhanAxios.post('/users/signIn',{phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
        let validationResult = validate(signInResponse.data, {
            "type": "object",
            "additionalProperties":false,
            "properties": {
                "status":{"type":"string"},
                "statusCode": { "const": 201},
                "token": { "type": "string" },
                "message":{"type":"string"}
            },
            "required":["status","statusCode","token","message"]
        });
        expect(validationResult.errors).toEqual([]);
        await api.badhanAxios.delete('/users/signout',{
            headers:{
                "x-auth": signInResponse.data.token
            }
        });
    }catch(e){
        processError(e);
    }

})