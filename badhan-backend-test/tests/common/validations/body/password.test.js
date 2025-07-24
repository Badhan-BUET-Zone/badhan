const {badhanAxios} = require("../../../../api");
const {validate} = require("jsonschema");
const {BODY_password_LengthError_Schema, BODY_password_RequiredError_Schema} = require('./passwordValidationSchemas')

test('validation: BODY/password/Password is required',async()=>{
    try{
        await badhanAxios.post('/users/signin',{
            phone: "8801521438557"
        })
    }catch (e) {
        let validationResult = validate(e.response.data, BODY_password_RequiredError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})

test('validation: BODY/password/Password length must be more than 4',async()=>{
    try{
        await badhanAxios.post('/users/signin',{
            phone: "8801521438557",
            password: "hh"
        })
    }catch (e) {
        let validationResult = validate(e.response.data, BODY_password_LengthError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})
