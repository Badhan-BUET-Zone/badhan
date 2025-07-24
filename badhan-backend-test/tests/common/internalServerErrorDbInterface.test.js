const {badhanAxios} = require("../../api");
const {validate} = require("jsonschema");
const {internalServerErrorSchema} = require("./schemas");

test('db interface internal server error in interface',async ()=>{
    try{
        await badhanAxios.post('/test/internalServerError/dbinterface',)
    }catch(e){
        let validationResult = validate(e.response.data, internalServerErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
