const { expectGuestError } = require('../../../lib');
const {
  BODY_password_LengthError_Schema,
  BODY_password_RequiredError_Schema,
} = require('./passwordValidationSchemas');

test('validation: BODY/password/Password is required', async () => {
  await expectGuestError('post', '/users/signin', BODY_password_RequiredError_Schema, {
    phone: '8801521438557',
  });
});

test('validation: BODY/password/Password length must be more than 4', async () => {
  await expectGuestError('post', '/users/signin', BODY_password_LengthError_Schema, {
    phone: '8801521438557',
    password: 'hh',
  });
});
