const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('GET/log',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });


        let response = await badhanAxios.get('/log',{
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
                            dateString: {type: "string"},
                            count:{type:"number"}
                        },
                        required: ["dateString","count"]
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