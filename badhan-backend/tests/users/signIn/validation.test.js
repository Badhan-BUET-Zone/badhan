const {badhanAxios} = require('../../../api');
const validate = require('jsonschema').validate;

const {phoneValidationErrorSchema} = require('./schemas')

test('POST/users/signIn: validations',async()=>{
    badhanAxios.post('/users/signin',{
        phone:'dummy string',
        password: null
    }).catch(e=>{
        let validationResult = validate(e.response.data, phoneValidationErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})
