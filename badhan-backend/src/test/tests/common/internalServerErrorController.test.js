const {internalServerErrorSchema} = require("./schemas");
const {badhanAxios} = require("../../api");
const {validate} = require("jsonschema");

test('controller internal server error in controller',async()=>{
    try{
        await badhanAxios.post('/test/internalServerError/controller',)
    }catch(e){
        let validationResult = validate(e.response.data, internalServerErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})

