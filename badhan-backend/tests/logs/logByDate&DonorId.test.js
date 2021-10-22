const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');
const logSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        logs: {
            type:"array",
            items: {
                type:"object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    date: {type: "number"},
                    operation: {type: "string"},
                    details:{type:"object"}
                },
                required: ["_id", "date", "operation","details"]
            }
        }
    },
    required: ["status", "statusCode", "message","logs"]
}

test('GET/log/date/{date}/donorId/{donorId}',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        const date=new Date().getTime();

        let response = await badhanAxios.get('/log/date/'+date+'/donorId/'+env.SUPERADMIN_ID,{
            headers:{
                "x-auth":signInResponse.data.token
            }
        });


        let validationResult = validate(response.data, logSchema);

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

test('GET/log/date/{date}/donorId/{donorId}',async()=>{
    try {
        const date=new Date().getTime();

        let response = await badhanAxios.get('/guest/log/date/'+date+'/donorId/'+env.SUPERADMIN_ID);

        let validationResult = validate(response.data, logSchema);

        expect(validationResult.errors).toEqual([]);

    }catch (e) {
        throw processError(e);
    }
})