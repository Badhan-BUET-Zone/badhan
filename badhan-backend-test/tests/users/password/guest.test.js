const { guestPatch } = require('../../lib');
const { patchPasswordSchema } = require('./schemas');

test('PATCH/guest/users/password: guest', async () => {
  await guestPatch('/guest/users/password', undefined, patchPasswordSchema);
});
