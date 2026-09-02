// POST /users/redirection takes an optional durationSeconds. The default is the one the web
// handoff has always relied on, so the no-body case is asserted here rather than assumed.
const { HTTP_STATUS } = require('../../lib/utils/constants');
const { postUsersRedirectionSchema } = require('./schemas');
const operations = require('../../lib/operations');

const REDIRECTION_TOKEN_DEFAULT_SECONDS = 30;
const REDIRECTION_TOKEN_MAX_SECONDS = 24 * 60 * 60;

const badRequestSchema = (message) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: message },
  },
  required: ['status', 'statusCode', 'message'],
});

const outOfRangeMessage = `durationSeconds must be an integer between 1 and ${REDIRECTION_TOKEN_MAX_SECONDS}`;

// A JWT is signed, not encrypted, so the lifetime it actually carries can be read straight off
// the token. This is the assertion that matters: the response field could agree with the request
// while the token itself expired on some other schedule.
const tokenLifetimeSeconds = (token) => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  return payload.exp - payload.iat;
};

const mint = (signInResponse, body) =>
  operations.authedPost('/users/redirection', body, signInResponse, postUsersRedirectionSchema);

test('POST /users/redirection: an empty body still mints the 30 second handoff token', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse, {});
  expect(response.data.durationSeconds).toBe(REDIRECTION_TOKEN_DEFAULT_SECONDS);
  expect(tokenLifetimeSeconds(response.data.token)).toBe(REDIRECTION_TOKEN_DEFAULT_SECONDS);
});

test('POST /users/redirection: durationSeconds sets the token lifetime', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse, { durationSeconds: 1800 });
  expect(response.data.durationSeconds).toBe(1800);
  expect(tokenLifetimeSeconds(response.data.token)).toBe(1800);
});

test('POST /users/redirection: the minted token authenticates as the caller', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse, { durationSeconds: 1800 });
  // The whole point of the token: it is an ordinary x-auth credential while it lives.
  const me = await operations.getMe({ data: { token: response.data.token } });
  expect(me.data.donor.designation).toBe(3);
});

test('POST /users/redirection: durationSeconds above the ceiling is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.expectAuthedError(
    'post',
    '/users/redirection',
    signInResponse,
    badRequestSchema(outOfRangeMessage),
    { durationSeconds: REDIRECTION_TOKEN_MAX_SECONDS + 1 }
  );
});

test('POST /users/redirection: a non-positive durationSeconds is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.expectAuthedError(
    'post',
    '/users/redirection',
    signInResponse,
    badRequestSchema(outOfRangeMessage),
    { durationSeconds: 0 }
  );
});
