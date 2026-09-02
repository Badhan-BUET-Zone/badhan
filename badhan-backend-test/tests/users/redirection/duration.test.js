// POST /users/redirection mints a token with NO expiry.
//
// It used to take a durationSeconds with a 30-second default and a 24-hour ceiling, both chosen
// for the web redirection handoff — a token that crosses one URL and is spent immediately. The
// MCP server changed what the token is for: an MCP config is written into a settings file once
// and left alone, and a token on any clock at all means editing that file on that clock.
//
// So the clock is gone, and what has to be pinned now is the opposite of what these tests used to
// pin: that the token carries no exp, that the knob is really gone rather than silently ignored,
// and above all that the revocation path works — because with no expiry it is the only one.
const { HTTP_STATUS } = require('../../lib/utils/constants');
const { postUsersRedirectionSchema } = require('./schemas');
const operations = require('../../lib/operations');
const { badhanAxios } = require('../../../api');

const mint = (signInResponse, body = {}) =>
  operations.authedPost('/users/redirection', body, signInResponse, postUsersRedirectionSchema);

// A JWT is signed, not encrypted, so what it actually claims can be read straight off it.
const payloadOf = (token) =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));

const withToken = (token) => ({ data: { token } });

test('POST /users/redirection: two mints are two different credentials', async () => {
  // The payload is the donor id plus a constant, and `iat` has one-second resolution, so without
  // a unique `jti` two expiry-less tokens minted in the same second come out byte-identical. Two
  // rows would then hold the same token string and deleting one would revoke nothing — the device
  // list would be showing connections it cannot actually end.
  const signInResponse = await operations.signInSuperAdmin();
  const first = (await mint(signInResponse)).data.token;
  const second = (await mint(signInResponse)).data.token;

  expect(first).not.toBe(second);
  expect(first).not.toBe(signInResponse.data.token);
  expect(payloadOf(first).jti).toEqual(expect.any(String));
  expect(payloadOf(first).jti).not.toBe(payloadOf(second).jti);
});

test('POST /users/redirection: the minted token carries no expiry at all', async () => {
  // Not "a very distant expiry" — no exp claim. jwt.verify only enforces one that is present, so
  // its absence is the whole mechanism, and a large number here would be a different feature.
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse);
  const payload = payloadOf(response.data.token);
  expect(payload.exp).toBeUndefined();
  expect(payload.access).toBe('auth');
});

test('POST /users/redirection: the response no longer advertises a lifetime', async () => {
  // The schema forbids extra properties, so this is really asserting the field is gone rather
  // than zero or null — a client reading durationSeconds must break loudly, not read a lie.
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse);
  expect(response.status).toBe(HTTP_STATUS.CREATED);
  expect(response.data.durationSeconds).toBeUndefined();
});

test('POST /users/redirection: a durationSeconds in the body is refused, not ignored', async () => {
  // The route declares an empty body model and tsoa is configured throw-on-extras, so a caller
  // still sending the old knob fails loudly. That is the point: accepting it silently would let
  // a caller believe it had asked for a 30-minute token while holding a permanent one.
  //
  // The status is asserted as "a refusal" rather than as one number: an excess property is a 500
  // everywhere in this app today, because nothing translates tsoa's ValidateError into the error
  // envelope. That is a project-wide gap, not this route's, and a test pinned to 500 would fail
  // the day somebody closes it.
  const signInResponse = await operations.signInSuperAdmin();
  try {
    await operations.authedPost('/users/redirection', { durationSeconds: 1800 }, signInResponse);
    throw new Error('Expected durationSeconds to be rejected, but it was accepted');
  } catch (e) {
    expect(e.response).toBeDefined();
    expect(e.response.status).toBeGreaterThanOrEqual(HTTP_STATUS.BAD_REQUEST);
    expect(JSON.stringify(e.response.data)).toContain('durationSeconds');
  }
});

test('POST /users/redirection: the minted token authenticates as the caller', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const response = await mint(signInResponse);
  const me = await operations.getMe(withToken(response.data.token));
  expect(me.data.donor.designation).toBe(3);
});

test('the minted token appears in the device list and can be deleted from it', async () => {
  // With no expiry this IS the revocation. If the token ever stopped appearing here, a member
  // would have no way to end one connection short of signing out of every device they own.
  const signInResponse = await operations.signInSuperAdmin();
  const token = (await mint(signInResponse)).data.token;

  // Asked from the BROWSER's session, which is where a member actually stands: GET /users/logins
  // returns every other token in `logins` and the caller's own in `currentLogin`, so the minted
  // one is a card in the list with its own Logout button.
  const before = await operations.authedGet('/users/logins', signInResponse);
  const ids = before.data.logins.map((login) => login._id);
  expect(ids.length).toBeGreaterThan(0);

  // Identify it the only way a member can: it is the row that is not the current session, and
  // deleting it must end that token and no other.
  const minted = await operations.authedGet('/users/logins', withToken(token));
  const tokenId = minted.data.currentLogin._id;
  expect(ids).toContain(tokenId);

  await badhanAxios.delete(`/users/logins/${tokenId}`, { headers: { 'x-auth': signInResponse.data.token } });

  try {
    await operations.getMe(withToken(token));
    throw new Error('Expected the deleted token to stop working');
  } catch (e) {
    expect(e.response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  }

  // The browser session it was minted from is untouched — deleting one card ends one connection.
  const me = await operations.getMe(signInResponse);
  expect(me.data.donor.designation).toBe(3);
});

test('signing out of ONE device does not end a token minted for an assistant', async () => {
  // The page and the manual both used to say plain signing out revokes it. It does not:
  // DELETE /users/signout deletes only the token that made the request. Pinned here so the
  // wording and the behaviour cannot drift apart again.
  const signInResponse = await operations.signInSuperAdmin();
  const token = (await mint(signInResponse)).data.token;

  await operations.signOut(signInResponse);

  const me = await operations.getMe(withToken(token));
  expect(me.data.donor.designation).toBe(3);
});

test('signing out of ALL devices does end it', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = (await mint(signInResponse)).data.token;

  await badhanAxios.delete('/users/signout/all', { headers: { 'x-auth': signInResponse.data.token } });

  try {
    await operations.getMe(withToken(token));
    throw new Error('Expected sign-out-from-all-devices to end the token');
  } catch (e) {
    expect(e.response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  }
});
