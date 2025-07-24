const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {processError} = require("../../fixtures/helpers");
const {signOutSchema} = require('./schemas')
test('DELETE/guest/users/signout: guest', async () => {
    try {

        let signOutResponse = await badhanAxios.delete('/guest/users/signout');
        let validationResult = validate(signOutResponse.data,signOutSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})
