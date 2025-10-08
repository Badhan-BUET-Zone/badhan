const { signInSchema } = require('./schemas');
const { guestPost } = require('../../lib');

test('POST/guest/users/signIn: guest', async () => {
  await guestPost('/guest/users/signin', undefined, signInSchema);
});
