const operations = require('../../lib/operations');
const flows = require('../../lib/flows');
const { postFeedbackTokenSchema } = require('../schemas');
const { buildDonorInfo, decodeJwtPayload, expectStatus } = require('../helpers');
const { HALLS_INDEX, HALL_ANY } = require('../../lib/utils/constants');

// POST /feedbacks/token, the branch — one optional `hall` field.
//
// Omit it and the route is what it has always been: anonymous, and the token carries the matched
// donor's own hall. State it and the request has to identify a caller who is allowed to state that
// hall. THE BRANCH IS KEYED ON THE BODY, NOT ON THE SESSION, and the first two tests here are what
// pin that — a signed-in caller who states no hall must still get the anonymous answer.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

async function volunteerIn(hall, signInResponse, options = {}) {
  const info = buildDonorInfo({ hall });
  const { volunteerToken, donorId } = await flows.createVolunteerWithToken(info, signInResponse, options);
  return { info, session: { data: { token: volunteerToken } }, donorId };
}

test('POST/feedbacks/token: no hall stated, no session — unchanged', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost(
    '/feedbacks/token',
    { phone: donorInfo.phone, studentId: donorInfo.studentId },
    postFeedbackTokenSchema
  );

  expect(response.status).toBe(200);
  expect(decodeJwtPayload(response.data.token).hall).toBe(HALLS_INDEX.CHATRI);
});

test('POST/feedbacks/token: stating a hall without a session is a 401', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  await operations.createDonor(donorInfo, signInResponse);

  const response = await expectStatus(
    () => operations.guestPost('/feedbacks/token', {
      phone: donorInfo.phone,
      studentId: donorInfo.studentId,
      hall: HALLS_INDEX.TITUMIR,
    }),
    401
  );

  // No token on a refusal, whatever the reason for it.
  expect(response.data.token).toBeUndefined();
});

test('POST/feedbacks/token: a volunteer may state their own hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { info, session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  const response = await operations.authedPost(
    '/feedbacks/token',
    { phone: info.phone, studentId: info.studentId, hall: HALLS_INDEX.CHATRI },
    session,
    postFeedbackTokenSchema
  );

  expect(response.status).toBe(200);
  expect(decodeJwtPayload(response.data.token).hall).toBe(HALLS_INDEX.CHATRI);
});

test('POST/feedbacks/token: a volunteer may not state another hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { info, session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  const response = await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { phone: info.phone, studentId: info.studentId, hall: HALLS_INDEX.TITUMIR },
      session
    ),
    403
  );

  expect(response.data.message).toBe('You are not authorized to access a donor of different hall');
  expect(response.data.token).toBeUndefined();
});

test('POST/feedbacks/token: a volunteer may not state All Halls', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { info, session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  // HALL_ANY needs no clause of its own in the check: no member's hall is -1, so the same
  // comparison that refuses another hall refuses this too.
  const response = await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { phone: info.phone, studentId: info.studentId, hall: HALL_ANY },
      session
    ),
    403
  );

  expect(response.data.message).toBe('You are not authorized to access a donor of different hall');
});

test('POST/feedbacks/token: a hall admin behaves exactly like a volunteer', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { info, session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse, {
    alsoPromoteHallAdmin: true,
  });

  const own = await operations.authedPost(
    '/feedbacks/token',
    { phone: info.phone, studentId: info.studentId, hall: HALLS_INDEX.CHATRI },
    session
  );
  expect(decodeJwtPayload(own.data.token).hall).toBe(HALLS_INDEX.CHATRI);

  await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { phone: info.phone, studentId: info.studentId, hall: HALLS_INDEX.TITUMIR },
      session
    ),
    403
  );
  await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { phone: info.phone, studentId: info.studentId, hall: HALL_ANY },
      session
    ),
    403
  );
});

test('POST/feedbacks/token: a super admin may state any hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  // Deliberately not their own, computed rather than hard-coded: the point of the test is that the
  // hall in the token is one the caller does not belong to.
  const otherHall = me.data.donor.hall === HALLS_INDEX.TITUMIR
    ? HALLS_INDEX.AHSANULLAH
    : HALLS_INDEX.TITUMIR;

  const response = await operations.authedPost(
    '/feedbacks/token',
    { phone: me.data.donor.phone, studentId: me.data.donor.studentId, hall: otherHall },
    signInResponse
  );

  expect(response.status).toBe(200);
  expect(decodeJwtPayload(response.data.token).hall).toBe(otherHall);
  expect(otherHall).not.toBe(me.data.donor.hall);
});

test('POST/feedbacks/token: a super admin may state All Halls', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);

  const response = await operations.authedPost(
    '/feedbacks/token',
    { phone: me.data.donor.phone, studentId: me.data.donor.studentId, hall: HALL_ANY },
    signInResponse
  );

  const payload = decodeJwtPayload(response.data.token);
  expect(payload.hall).toBe(HALL_ANY);
  // Still exactly two claims. The extra value goes in the claim that already exists, so the QR
  // stays as sparse as it was.
  expect(Object.keys(payload).sort()).toEqual(['exp', 'hall']);
});

test('POST/feedbacks/token: a hall outside the allowed set is a 400, session or not', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const credentials = { phone: me.data.donor.phone, studentId: me.data.donor.studentId };

  // Attached is a real hall index and still refused: a code is something you make for a hall you
  // belong to, and nobody belongs to Attached. A super admin gets the same 400 as anybody.
  await expectStatus(
    () => operations.authedPost('/feedbacks/token', { ...credentials, hall: HALLS_INDEX.ATTACHED }, signInResponse),
    400
  );
  await expectStatus(
    () => operations.authedPost('/feedbacks/token', { ...credentials, hall: 99 }, signInResponse),
    400
  );

  // And a malformed hall is a 400 even with no session at all — the validator runs before the
  // conditional authentication, so this never reaches a 401.
  await expectStatus(
    () => operations.guestPost('/feedbacks/token', { ...credentials, hall: 'abc' }),
    400
  );
  await expectStatus(
    () => operations.guestPost('/feedbacks/token', { ...credentials, hall: 99 }),
    400
  );
});

test('POST/feedbacks/token: a signed-in caller stating no hall gets the anonymous answer', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  await operations.createDonor(donorInfo, signInResponse);
  const credentials = { phone: donorInfo.phone, studentId: donorInfo.studentId };

  const anonymous = await operations.guestPost('/feedbacks/token', credentials);
  const signedIn = await operations.authedPost('/feedbacks/token', credentials, signInResponse);

  // This is the test that keeps the branch keyed on the body. The day somebody makes the handler
  // ask "is there a session?" instead of "is there a hall?", this fails.
  expect(signedIn.status).toBe(anonymous.status);
  expect(signedIn.data.donor).toEqual(anonymous.data.donor);
  expect(decodeJwtPayload(signedIn.data.token).hall).toBe(HALLS_INDEX.CHATRI);
});

test('POST/feedbacks/token: the donor summary is the same nine fields on the hall branch', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);

  const response = await operations.authedPost(
    '/feedbacks/token',
    { phone: me.data.donor.phone, studentId: me.data.donor.studentId, hall: HALLS_INDEX.TITUMIR },
    signInResponse,
    postFeedbackTokenSchema
  );

  // It is the CALLER'S OWN record on both branches, so minting for another hall discloses nothing
  // about that hall — and it is still exactly nine fields.
  expect(Object.keys(response.data.donor).sort()).toEqual([
    'bloodGroup',
    'donationCount',
    'hall',
    'lastDonation',
    'lastPlateletDonation',
    'name',
    'phone',
    'plateletDonationCount',
    'studentId',
  ]);
  expect(response.data.donor.phone).toBe(me.data.donor.phone);
});

test('POST/feedbacks/token: durationMinutes behaves the same on both branches', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const credentials = { phone: me.data.donor.phone, studentId: me.data.donor.studentId };

  const defaulted = await operations.authedPost(
    '/feedbacks/token',
    { ...credentials, hall: HALLS_INDEX.TITUMIR },
    signInResponse
  );
  const minutes = Math.round((decodeJwtPayload(defaulted.data.token).exp * 1000 - Date.now()) / 60000);
  expect(minutes).toBeGreaterThanOrEqual(14);
  expect(minutes).toBeLessThanOrEqual(15);

  const full = await operations.authedPost(
    '/feedbacks/token',
    { ...credentials, hall: HALLS_INDEX.TITUMIR, durationMinutes: 1440 },
    signInResponse
  );
  expect(full.status).toBe(200);

  await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { ...credentials, hall: HALLS_INDEX.TITUMIR, durationMinutes: 2000 },
      signInResponse
    ),
    400
  );
});

test('POST/feedbacks/token: stating a hall is logged, and stating none is not', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const credentials = { phone: me.data.donor.phone, studentId: me.data.donor.studentId };

  await operations.guestPost('/feedbacks/token', credentials);
  let logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'POST FEEDBACK TOKEN')).toHaveLength(0);

  await operations.authedPost('/feedbacks/token', { ...credentials, hall: HALLS_INDEX.TITUMIR }, signInResponse);
  logs = await operations.getLogs(signInResponse);

  // Generating a registration code is attributable at last: the anonymous path has no user id to
  // log against, and the hall path always does.
  expect(logs.data.logs.filter((l) => l.operation === 'POST FEEDBACK TOKEN')).toHaveLength(1);
});

test('POST/feedbacks/token: a refused hall writes no log row', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { info, session } = await volunteerIn(HALLS_INDEX.CHATRI, signInResponse);

  await expectStatus(
    () => operations.authedPost(
      '/feedbacks/token',
      { phone: info.phone, studentId: info.studentId, hall: HALLS_INDEX.TITUMIR },
      session
    ),
    403
  );

  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'POST FEEDBACK TOKEN')).toHaveLength(0);
});
