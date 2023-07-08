const {badhanAxios} = require("../../api");
const {validate} = require("jsonschema");
const {routeNotFoundErrorSchema} = require('./schemas')
test('route not found testing', async () => {
    try{
        await badhanAxios.delete('/blahblahblahblah')
    }catch (e) {
        let validationResult = validate(e.response.data,routeNotFoundErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
