const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError}=require('../fixtures/helpers');

const postActiveDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        newActiveDonor:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"integer"},
            }
        }
    }
}


const deleteActiveDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        removedActiveDonor:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"integer"},
            }
        }
    }
}

test('POST & DELETE /activeDonors',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        // clear up any existing active donor to begin testing
        try{
            await badhanAxios.delete(`/activeDonors/${env.SUPERADMIN_ID}`, {
                headers: {
                    "x-auth": signInResponse.data.token
                }
            });
        }catch (e) {

        }

        let createActiveDonorResponse = await badhanAxios.post('/activeDonors',{
            donorId: env.SUPERADMIN_ID,
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let createActiveDonorValidationResult = validate(createActiveDonorResponse.data, postActiveDonorSchema);

        expect(createActiveDonorValidationResult.errors).toEqual([]);

        let deleteActiveDonorResponse = await badhanAxios.delete(`/activeDonors/${env.SUPERADMIN_ID}`, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let deleteActiveDonorValidateResult = validate(deleteActiveDonorResponse.data,deleteActiveDonorSchema);
        expect(deleteActiveDonorValidateResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    }catch (e) {
        throw processError(e);
    }
});
test('POST & DELETE /guest/activeDonors',async()=>{
    try {
        let createActiveDonorResponse = await badhanAxios.post('/guest/activeDonors',{
        },{
        })

        let createActiveDonorValidationResult = validate(createActiveDonorResponse.data, postActiveDonorSchema);

        expect(createActiveDonorValidationResult.errors).toEqual([]);

        let deleteActiveDonorResponse = await badhanAxios.delete(`/guest/activeDonors/${env.SUPERADMIN_ID}`, {
        });

        let deleteActiveDonorValidateResult = validate(deleteActiveDonorResponse.data,deleteActiveDonorSchema);
        expect(deleteActiveDonorValidateResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
});

