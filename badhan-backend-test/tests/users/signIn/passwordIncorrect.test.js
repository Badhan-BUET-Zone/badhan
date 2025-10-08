const env = require('../../../config');
const { expectGuestError } = require('../../lib');
const { passwordIncorrectErrorSchema } = require('./schemas');
test('POST/users/signIn: password incorrect', async () => {
  await expectGuestError('post', '/users/signin', passwordIncorrectErrorSchema, {
    phone: env.SUPERADMIN_PHONE,
    password: 'dummy',
  });
});
