// PATCH /users/redirection is gone. It used to exchange a redirection token for a permanent
// one, which is precisely what made a leaked short-lived token as good as a password — so this
// test is the guard against it coming back rather than a test of what it used to do. The minting
// half lives on and is covered in duration.test.js.
const { badhanAxios } = require('../../../api');
const { HTTP_STATUS } = require('../../lib/utils/constants');
const { postUsersRedirectionSchema } = require('./schemas');
const operations = require('../../lib/operations');

test('PATCH /users/redirection: the route no longer exists', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const redirectionResponse = await operations.authedPost(
    '/users/redirection',
    {},
    signInResponse,
    postUsersRedirectionSchema
  );

  // A real, live token, refused for the only reason that matters: nothing is listening.
  try {
    await badhanAxios.patch('/users/redirection', { token: redirectionResponse.data.token });
    throw new Error('Expected PATCH /users/redirection to be gone, but it answered');
  } catch (e) {
    expect(e.response).toBeDefined();
    expect(e.response.status).toBe(HTTP_STATUS.NOT_FOUND);
  }
});
