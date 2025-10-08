const { expectGuestError } = require('../../../lib');
const {
  PARAM_tokenId_RequiredError_Schema,
  PARAM_tokenId_InvalidError_Schema,
} = require('./tokenIdValidationSchemas');

test('validation: PARAM/tokenId/tokenId is required', async () => {
  await require('../../../lib').guestDelete('/users/logins/');
});

test('validation: PARAM/tokenId/Enter a valid tokenId', async () => {
  await expectGuestError('delete', '/users/logins/dummy', PARAM_tokenId_InvalidError_Schema);
});
