const {jwtInvalidSchema} = require("./schemas");
const {badhanAxios} = require("../../api");
const {validate} = require("jsonschema");

test('invalid jwt token',async()=>{
    try{
        await badhanAxios.post('/users/signout')
    }catch (e) {
        let validationResult = validate(e.response.data, jwtInvalidSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
