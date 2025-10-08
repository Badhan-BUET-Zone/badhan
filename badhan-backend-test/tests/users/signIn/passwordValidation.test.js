const { expectGuestError } = require('../../lib');

const {
  BODY_password_RequiredError_Schema,
} = require('../../common/validations/body/passwordValidationSchemas');

test('POST/users/signIn: password validation', async () => {
  await expectGuestError('post', '/users/signin', BODY_password_RequiredError_Schema, {
    phone: '8801521438557',
  });
});
