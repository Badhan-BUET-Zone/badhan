const env = require('../../../config');
const { postUsersRedirectionSchema, patchUsersRedirectionSchema } = require('./schemas');
const operations = require('../../lib/operations');

test('POST&PATCH/users/redirection: success', async () => {
  const signInResponse = await operations.signIn(env.SUPERADMIN_PHONE, env.SUPERADMIN_PASSWORD);
  const redirectionResponse = await operations.authedPost(
    '/users/redirection',
    {},
    signInResponse,
    postUsersRedirectionSchema
  );
  await operations.authedDelete('/users/signout', signInResponse);
  await operations.guestPatch(
    '/users/redirection',
    { token: redirectionResponse.data.token },
    patchUsersRedirectionSchema
  );
});
