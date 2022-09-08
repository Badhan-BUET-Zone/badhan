const {badhanAxios} = require("../../../api");
const env = require("../../../config");
const {validate} = require("jsonschema");
const {passwordIncorrectErrorSchema} = require('./schemas')
test('POST/users/signIn: password incorrect',async()=>{
    badhanAxios.post('/users/signin',{
        phone: env.SUPERADMIN_PHONE,
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, passwordIncorrectErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})
