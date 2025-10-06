const { expectGuestError } = require("../../lib");
const {phoneNotFoundErrorSchema} = require('./schemas')

test('POST/users/signIn: phone not found',async()=>{
    await expectGuestError('post', '/users/signin', phoneNotFoundErrorSchema, {
        phone: 8801564565458,
        password: "dummy"
    });
})
