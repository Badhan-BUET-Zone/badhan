const { jwtInvalidSchema } = require('../../common/schemas');
const { expectGuestError } = require('../../lib');

test('DELETE/users/signOut: authentication', async () => {
  await expectGuestError('delete', '/users/signout', jwtInvalidSchema);
});
