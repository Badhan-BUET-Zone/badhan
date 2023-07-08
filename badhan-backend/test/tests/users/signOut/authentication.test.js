const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {jwtInvalidSchema} = require('../../common/schemas')
test('DELETE/users/signOut: authentication', async () => {
    try{
        await badhanAxios.delete('/users/signout')
    }catch(e){
        let validationResult = validate(e.response.data,jwtInvalidSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
