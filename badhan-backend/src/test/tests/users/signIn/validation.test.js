const {badhanAxios} = require('../../../api');
const validate = require('jsonschema').validate;

const {BODY_phone_LengthError_Schema} = require('../../common/validations/body/phoneValidationSchemas')
const {BODY_password_RequiredError_Schema} = require('../../common/validations/body/passwordValidationSchemas')

test('POST/users/signIn: phone validation',async()=>{
    try{
        await badhanAxios.post('/users/signin',{
            phone:'dummy string',
            password: null
        })
    }catch (e) {
        let validationResult = validate(e.response.data, BODY_phone_LengthError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})

test('POST/users/signIn: password validation',async()=>{
    try{
        await badhanAxios.post('/users/signin',{
            phone:'8801521438557',
        })
    }catch (e) {
        let validationResult = validate(e.response.data, BODY_password_RequiredError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})

