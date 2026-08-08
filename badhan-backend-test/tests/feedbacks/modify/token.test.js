const operations = require('../../lib/operations');
const { postFeedbackTokenSchema } = require('../schemas');
const { buildDonorInfo, mintToken, decodeJwtPayload, expectStatus } = require('../helpers');
const { uniquePhone } = require('../../helpers');

// POST /feedbacks/token — the one mint route. Unauthenticated, one mode, no branches: a donor
// arriving from a printed QR and a volunteer generating a registration code send the same body to
// the same place.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

test('POST/feedbacks/token: no session, matching pair returns the summary and a token', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost(
    '/feedbacks/token',
    { phone: donorInfo.phone, studentId: donorInfo.studentId },
    postFeedbackTokenSchema
  );

  expect(response.status).toBe(200);
  expect(response.data.donor.name).toBe(donorInfo.name);
  expect(response.data.donor.hall).toBe(donorInfo.hall);
});

test('POST/feedbacks/token: the donor payload is exactly the nine public fields', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ address: 'SECRET ADDRESS', comment: 'SECRET COMMENT' });
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost('/feedbacks/token', {
    phone: donorInfo.phone,
    studentId: donorInfo.studentId,
  });

  // Anyone who knows a phone number and a student ID can read this, which is exactly why nothing
  // more sensitive may be in it. This assertion fails the day somebody adds a tenth field.
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
  expect(JSON.stringify(response.data)).not.toContain('SECRET ADDRESS');
  expect(JSON.stringify(response.data)).not.toContain('SECRET COMMENT');
});

test('POST/feedbacks/token: the token carries a hall and an expiry and no identity', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost('/feedbacks/token', {
    phone: donorInfo.phone,
    studentId: donorInfo.studentId,
  });
  const payload = decodeJwtPayload(response.data.token);

  // A JWT payload is signed, not encrypted, and this token gets printed into a QR code that a room
  // full of students can decode. A hall number is not worth protecting; the phone number of the
  // volunteer who generated the code is.
  expect(Object.keys(payload).sort()).toEqual(['exp', 'hall']);
  expect(payload.hall).toBe(donorInfo.hall);
  expect(response.data.expiresAt).toBe(payload.exp * 1000);
});

test('POST/feedbacks/token: every kind of mismatch answers identically', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const wrongStudentId = await expectStatus(
    () => operations.guestPost('/feedbacks/token', { phone: donorInfo.phone, studentId: '1905999' }),
    404
  );
  const wrongPhone = await expectStatus(
    () => operations.guestPost('/feedbacks/token', { phone: uniquePhone(), studentId: donorInfo.studentId }),
    404
  );
  const neither = await expectStatus(
    () => operations.guestPost('/feedbacks/token', { phone: uniquePhone(), studentId: '1905998' }),
    404
  );

  // Byte-identical, compared to each other rather than to an expected string: anything that
  // distinguishes them turns the route into an oracle for probing which phone numbers exist.
  expect(JSON.stringify(wrongStudentId.data)).toEqual(JSON.stringify(wrongPhone.data));
  expect(JSON.stringify(wrongPhone.data)).toEqual(JSON.stringify(neither.data));
  expect(wrongStudentId.data.message).toBe('Information does not match. Please contact a volunteer.');
  expect(wrongStudentId.data.token).toBeUndefined();
});

test('POST/feedbacks/token: durations default to 15 minutes and clamp at 24 hours', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const minutesOf = (token) => Math.round((decodeJwtPayload(token).exp - Date.now() / 1000) / 60);

  expect(minutesOf(await mintToken(donorInfo.phone, donorInfo.studentId))).toBe(15);
  expect(minutesOf(await mintToken(donorInfo.phone, donorInfo.studentId, 1440))).toBe(1440);

  // Past the ceiling the validator refuses rather than the service silently clamping, so a caller
  // asking for a week is told so.
  await expectStatus(
    () => operations.guestPost('/feedbacks/token', {
      phone: donorInfo.phone,
      studentId: donorInfo.studentId,
      durationMinutes: 2000,
    }),
    400
  );
});

test('POST/feedbacks/token: one credential alone is a 400, not a 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  await expectStatus(() => operations.guestPost('/feedbacks/token', { phone: donorInfo.phone }), 400);
  await expectStatus(() => operations.guestPost('/feedbacks/token', { studentId: donorInfo.studentId }), 400);
  await expectStatus(() => operations.guestPost('/feedbacks/token', { phone: 123, studentId: 'abc' }), 400);
});

test('POST/feedbacks/token: a signed-in caller gets exactly the anonymous answer', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const anonymous = await operations.guestPost('/feedbacks/token', {
    phone: donorInfo.phone,
    studentId: donorInfo.studentId,
  });
  const signedIn = await operations.authedPost(
    '/feedbacks/token',
    { phone: donorInfo.phone, studentId: donorInfo.studentId },
    signInResponse
  );

  // There is no session branch on this route, and this is what pins it: the QR generator reuses the
  // very same call the public page makes.
  expect(signedIn.status).toBe(anonymous.status);
  expect(signedIn.data.donor).toEqual(anonymous.data.donor);
  expect(Object.keys(decodeJwtPayload(signedIn.data.token)).sort()).toEqual(['exp', 'hall']);
});
