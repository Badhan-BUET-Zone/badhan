const {signInSchema} = require("./schemas");

const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {processError} = require("../../fixtures/helpers");

test('POST/guest/users/signIn: guest',async()=>{
    try{
        let signInResponse = await badhanAxios.post('/guest/users/signin');
        let validationResult = validate(signInResponse.data, signInSchema);
        expect(validationResult.errors).toEqual([]);
    }catch(e){
        processError(e);
    }

})
