const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('GET/log/date/{date}/donorId/{donorId}',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        const date=new Date().getTime();

        let response = await badhanAxios.get('/log/date/'+date+'/donorId/'+env.DONOR_ID,{
            headers:{
                "x-auth":signInResponse.data.token
            }
        });


        let validationResult = validate(response.data, {
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