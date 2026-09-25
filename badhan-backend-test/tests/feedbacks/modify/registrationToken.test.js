const operations = require('../../lib/operations');
const flows = require('../../lib/flows');
const { postRegistrationTokenSchema } = require('../schemas');
const { buildDonorInfo, decodeJwtPayload, expectStatus } = require('../helpers');
const { HALLS_INDEX, HALL_ANY } = require('../../lib/utils/constants');

// POST /feedbacks/registrationToken — the only route in the feature that mints anything, and the
// only one that requires a session. One field: the hall the code is for. No credentials of the
// caller's own, because the session already says who they are, and no duration, because the token
// it returns NEVER EXPIRES.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

async function volunteerIn(hall, signInResponse, options = {}) {
  const info = buildDonorInfo({ hall });
  const { volunteerToken, donorId } = await flows.createVolunteerWithToken(info, signInResponse, options);
  return { info, session: { data: { token: volunteerToken } }, donorId };
}

test('POST/feedbacks/registrationToken: without a session it is a 401', async () => {
  const response = await expectStatus(
    () => operations.guestPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.CHATRI }),
    401
  );

  // No token on a refusal, whatever the reason for it.
  expect(response.data.token).toBeUndefined();
});

test('POST/feedbacks/registrationToken: the token is exactly one claim and no expiry', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const response = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall: HALLS_INDEX.TITUMIR },
    signInResponse,
    postRegistrationTokenSchema
  );
  const payload = decodeJwtPayload(response.data.token);

  // THIS IS THE TEST THAT PINS THE WHOLE FEATURE. A JWT payload is signed, not encrypted, and this
  // token is printed into a QR code that a room full of students can decode — so `hall` had better
  // be all of it. No `exp` (the code never expires), no `iat`, and neither of the two claims that
  // would make it a session token.
  expect(Object.keys(payload)).toEqual(['hall']);
  expect(payload.hall).toBe(HALLS_INDEX.TITUMIR);
  expect(payload.exp).toBeUndefined();
  expect(payload.iat).toBeUndefined();
  expect(response.data.expiresAt).toBeUndefined();
});

test('POST/feedbacks/registrationToken: a volunteer may state their own hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  const response = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall: HALLS_INDEX.CHATRI },
    session,
    postRegistrationTokenSchema
  );

  expect(response.status).toBe(200);
  expect(decodeJwtPayload(response.data.token).hall).toBe(HALLS_INDEX.CHATRI);
});

test('POST/feedbacks/registrationToken: a volunteer may not state another hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  const response = await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.TITUMIR }, session),
    403
  );

  expect(response.data.message).toBe('You are not authorized to access a donor of different hall');
  expect(response.data.token).toBeUndefined();
});

test('POST/feedbacks/registrationToken: a volunteer may not state All Halls', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  // HALL_ANY needs no clause of its own in the check: no member's hall is -1, so the same
  // comparison that refuses another hall refuses this too.
  const response = await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALL_ANY }, session),
    403
  );

  expect(response.data.message).toBe('You are not authorized to access a donor of different hall');
});

test('POST/feedbacks/registrationToken: a hall admin behaves exactly like a volunteer', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse, {
    alsoPromoteHallAdmin: true,
  });

  const own = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall: HALLS_INDEX.CHATRI },
    session
  );
  expect(decodeJwtPayload(own.data.token).hall).toBe(HALLS_INDEX.CHATRI);

  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.TITUMIR }, session),
    403
  );
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALL_ANY }, session),
    403
  );
});

test('POST/feedbacks/registrationToken: a super admin may state any hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  // Deliberately not their own, computed rather than hard-coded: the point of the test is that the
  // hall in the token is one the caller does not belong to.
  const otherHall = me.data.donor.hall === HALLS_INDEX.TITUMIR
    ? HALLS_INDEX.AHSANULLAH
    : HALLS_INDEX.TITUMIR;

  const response = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall: otherHall },
    signInResponse
  );

  expect(response.status).toBe(200);
  expect(decodeJwtPayload(response.data.token).hall).toBe(otherHall);
  expect(otherHall).not.toBe(me.data.donor.hall);
});

test('POST/feedbacks/registrationToken: a super admin may state All Halls', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const response = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall: HALL_ANY },
    signInResponse
  );

  const payload = decodeJwtPayload(response.data.token);
  expect(payload.hall).toBe(HALL_ANY);
  // Still exactly one claim. The extra meaning goes in the claim that already exists, so the QR
  // stays as sparse as it was.
  expect(Object.keys(payload)).toEqual(['hall']);
});

test('POST/feedbacks/registrationToken: a missing or disallowed hall is a 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // The hall is required now, not optional: there is no donor record to fall back on, because the
  // route never looks one up.
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', {}, signInResponse),
    400
  );

  // Attached and (Unknown) are real hall indices and still refused: a code is something you make
  // for a hall you belong to, and nobody belongs to either. A super admin gets the same 400 as
  // anybody. (Unknown) is the narrower of the two rules — it IS a legal hall on a donor record,
  // so this is the test that stops the QR set drifting back to the donor set.
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.ATTACHED }, signInResponse),
    400
  );
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.UNKNOWN }, signInResponse),
    400
  );
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: 99 }, signInResponse),
    400
  );
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: 'abc' }, signInResponse),
    400
  );
});

test('POST/feedbacks/registrationToken: a malformed hall is a 400 before it is a 401', async () => {
  // The validator runs ahead of the authentication, so a request with no session AND a bad hall is
  // told about the hall. Worth pinning: the order is what keeps a 400 from masquerading as a 401.
  await expectStatus(
    () => operations.guestPost('/feedbacks/registrationToken', { hall: 'abc' }),
    400
  );
});

test('POST/feedbacks/registrationToken: every mint is logged, and a refusal is not', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  await operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.TITUMIR }, signInResponse);
  let logs = await operations.getLogs(signInResponse);
  const rows = logs.data.logs.filter((l) => l.operation === 'POST FEEDBACK REGISTRATION TOKEN');

  // The log entry is the ONLY record that a permanent code exists, since nothing is stored and
  // nothing can be revoked. Every mint is attributable — there is no anonymous branch left.
  expect(rows).toHaveLength(1);

  const { session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);
  await expectStatus(
    () => operations.authedPost('/feedbacks/registrationToken', { hall: HALLS_INDEX.TITUMIR }, session),
    403
  );

  logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'POST FEEDBACK REGISTRATION TOKEN')).toHaveLength(1);
});
