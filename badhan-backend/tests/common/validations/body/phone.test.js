const {badhanAxios} = require("../../../../api");
const {validate} = require("jsonschema");
const {BODY_phone_LengthError_Schema, BODY_phone_RequiredError_Schema, BODY_phone_AllowedRangeError_Schema} = require('./phoneValidationSchemas')

test('validation: BODY/phone/Phone number is required',async()=>{
    badhanAxios.post('/users/signin',{
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, BODY_phone_RequiredError_Schema);
        expect(validationResult.errors).toEqual([]);
    })
})

test('validation: BODY/phone/Phone number must be of 13 digits', async ()=>{
    badhanAxios.post('/users/signin',{
        phone: "8844",
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, BODY_phone_LengthError_Schema);
        expect(validationResult.errors).toEqual([])
    })
})

test('validation: BODY/phone/Phone number must an integer between 8801000000000 and 8801999999999', async ()=>{
    badhanAxios.post('/users/signin',{
        phone: "9999999999999",
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, BODY_phone_AllowedRangeError_Schema);
        expect(validationResult.errors).toEqual([])
    })
})
