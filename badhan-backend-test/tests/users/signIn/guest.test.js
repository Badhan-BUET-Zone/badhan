const {signInSchema} = require("./schemas");

const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");

test('POST/guest/users/signIn: guest',async()=>{
        let signInResponse = await badhanAxios.post('/guest/users/signin');
        let validationResult = validate(signInResponse.data, signInSchema);
        expect(validationResult.errors).toEqual([]);

})
