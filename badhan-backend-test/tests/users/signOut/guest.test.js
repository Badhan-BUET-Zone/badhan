const { guestDelete } = require('../../lib');
const { signOutSchema } = require('./schemas');

test('DELETE/guest/users/signout: guest', async () => {
  await guestDelete('/guest/users/signout', signOutSchema);
});
