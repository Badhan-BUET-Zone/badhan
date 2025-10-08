const { internalServerErrorSchema } = require('./schemas');
const { expectGuestError } = require('../lib');

test('controller internal server error in controller', async () => {
  await expectGuestError('post', '/test/internalServerError/controller', internalServerErrorSchema);
});
