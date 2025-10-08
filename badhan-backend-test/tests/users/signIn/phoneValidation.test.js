const { expectGuestError } = require('../../lib');

const {
  BODY_phone_LengthError_Schema,
} = require('../../common/validations/body/phoneValidationSchemas');

test('POST/users/signIn: phone validation', async () => {
  await expectGuestError('post', '/users/signin', BODY_phone_LengthError_Schema, {
    phone: 'dummy string',
    password: null,
  });
});
