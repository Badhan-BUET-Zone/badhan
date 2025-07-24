const {badhanAxios} = require('../../../../api');
const {validate} = require("jsonschema");
const {PARAM_tokenId_RequiredError_Schema, PARAM_tokenId_InvalidError_Schema} = require('./tokenIdValidationSchemas')

test('validation: PARAM/tokenId/tokenId is required', async () => {
    try {
        await badhanAxios.delete('/users/logins/');
    } catch (e) {
        let validationResult = validate(e.response.data,PARAM_tokenId_RequiredError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})

test('validation: PARAM/tokenId/Enter a valid tokenId', async () => {
    try {
        await badhanAxios.delete('/users/logins/dummy');
    } catch (e) {
        let validationResult = validate(e.response.data,PARAM_tokenId_InvalidError_Schema);
        expect(validationResult.errors).toEqual([]);
    }
})
