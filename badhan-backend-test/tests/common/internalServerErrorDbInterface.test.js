const { expectGuestError } = require("../lib");
const {internalServerErrorSchema} = require("./schemas");

test('db interface internal server error in interface',async ()=>{
    await expectGuestError('post', '/test/internalServerError/dbinterface', internalServerErrorSchema);
})
