const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

test('GET/log/statistics',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });

        let statisticsResponse = await badhanAxios.get('/log/statistics',{
            headers:{
                "x-auth":signInResponse.data.token
            }
        });


        let validationResult = validate(statisticsResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                "status": {type: "string"},
                "statusCode": {const: 200},
                "message": {type: "string"},
                "statistics": {
                    type:"object",
                    additionalProperties:false,
                    properties:{
                        "donorCount": {type:"number"},
                        "donationCount": {type:"number"},
                        "volunteerCount": {type:"number"}
                    },
                    required:["donorCount","donationCount","volunteerCount"]
                }
            },
            required: ["status", "statusCode", "message","statistics"]
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