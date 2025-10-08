const { expectGuestError } = require('../../../lib');
const {
  BODY_phone_LengthError_Schema,
  BODY_phone_RequiredError_Schema,
  BODY_phone_AllowedRangeError_Schema,
} = require('./phoneValidationSchemas');

test('validation: BODY/phone/Phone number is required', async () => {
  await expectGuestError('post', '/users/signin', BODY_phone_RequiredError_Schema, {
    password: 'dummy',
  });
});

test('validation: BODY/phone/Phone number must be of 13 digits', async () => {
  await expectGuestError('post', '/users/signin', BODY_phone_LengthError_Schema, {
    phone: '8844',
    password: 'dummy',
  });
});

test('validation: BODY/phone/Phone number must an integer between 8801000000000 and 8801999999999', async () => {
  await expectGuestError('post', '/users/signin', BODY_phone_AllowedRangeError_Schema, {
    phone: '9999999999999',
    password: 'dummy',
  });
});
