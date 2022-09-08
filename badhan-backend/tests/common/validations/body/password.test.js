const {badhanAxios} = require("../../../../api");
const {validate} = require("jsonschema");

const passwordRequiredErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Password is required'}
    },
    required:["status","statusCode","message"]
}

const passwordLengthErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Password length must be more than 4'}
    },
    required:["status","statusCode","message"]
}

test('validation: BODY/password/Password is required',async()=>{
    badhanAxios.post('/users/signin',{
        phone: "8801521438557"
    }).catch(e=>{
        let validationResult = validate(e.response.data, passwordRequiredErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})

test('validation: BODY/password/Password length must be more than 4',async()=>{
    badhanAxios.post('/users/signin',{
        phone: "8801521438557",
        password: "hh"
    }).catch(e=>{
        let validationResult = validate(e.response.data, passwordLengthErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})
