const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {phoneNotFoundErrorSchema} = require('./schemas')

test('POST/users/signIn: phone not found',async()=>{

    badhanAxios.post('/users/signin',{
        phone: 8801564565458,
        password: "dummy"
    }).catch(e=>{
        let validationResult = validate(e.response.data, phoneNotFoundErrorSchema);
        expect(validationResult.errors).toEqual([]);
    })
})
