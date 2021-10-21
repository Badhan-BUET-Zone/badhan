const {badhanAxios} = require('../../api');
const env = require('../../config/config');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');
const signInSchema={
    type: "object",
    additionalProperties:false,
    properties: {
        status:{type:"string"},
        statusCode: { const: 201},
        token: { type: "string" },
        message:{type:"string"}
    },
    required:["status","statusCode","token","message"]
};

test('POST/users/signIn',async()=>{
    try{
        let signInResponse = await badhanAxios.post('/users/signin',{phone:"8801521438557",password: env.MAHATHIR_PASSWORD});
        let validationResult = validate(signInResponse.data, signInSchema);
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout',{
            headers:{
                "x-auth": signInResponse.data.token
            }
        });
    }catch(e){
        processError(e);
    }

})

test('POST/guest/users/signIn',async()=>{
    try{
        let signInResponse = await badhanAxios.post('/guest/users/signin',{});
        let validationResult = validate(signInResponse.data, signInSchema);
        expect(validationResult.errors).toEqual([]);
    }catch(e){
        processError(e);
    }

})