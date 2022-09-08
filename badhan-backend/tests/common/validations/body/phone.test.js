const {badhanAxios} = require("../../../../api");
const {validate} = require("jsonschema");

const phoneValidationErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number is required'}
    },
    required:["status","statusCode","message"]
}

const phoneLengthErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number must be of 13 digits'}
    },
    required:["status","statusCode","message"]
}

const phoneAllowedRangeErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number must an integer between 8801000000000 and 8801999999999'}
    },
    required:["status","statusCode","message"]
}

test('validation: BODY/phone/Phone number is required',async()=>{
    badhanAxios.post('/users/signin',{
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, phoneValidationErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})

test('validation: BODY/phone/Phone number must be of 13 digits', async ()=>{
    badhanAxios.post('/users/signin',{
        phone: "8844",
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, phoneLengthErrorSchema);
        expect(validationResult.errors).toEqual([])
    })
})

test('validation: BODY/phone/Phone number must an integer between 8801000000000 and 8801999999999', async ()=>{
    badhanAxios.post('/users/signin',{
        phone: "9999999999999",
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, phoneAllowedRangeErrorSchema);
        expect(validationResult.errors).toEqual([])
    })
})
