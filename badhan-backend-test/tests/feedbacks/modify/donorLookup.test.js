const operations = require('../../lib/operations');
const { postDonorLookupSchema } = require('../schemas');
const { buildDonorInfo, expectStatus } = require('../helpers');
const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// POST /feedbacks/donorLookup — the public identity check behind /#/donor. Unauthenticated, one
// mode, no branches, and NO CREDENTIAL IN THE ANSWER: it hands back a record and nothing that
// could be spent on anything.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

test('POST/feedbacks/donorLookup: no session, a matching pair returns the summary', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost(
    '/feedbacks/donorLookup',
    { phone: donorInfo.phone, studentId: donorInfo.studentId },
    postDonorLookupSchema
  );

  expect(response.status).toBe(200);
  expect(response.data.donor.name).toBe(donorInfo.name);
  expect(response.data.donor.hall).toBe(donorInfo.hall);
});

test('POST/feedbacks/donorLookup: the answer carries no token of any kind', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost('/feedbacks/donorLookup', {
    phone: donorInfo.phone,
    studentId: donorInfo.studentId,
  });

  // The whole point of the route. A 200 here authorises nothing: the donor sends their phone and
  // student ID again to file a message, and the submit route matches them for itself. The day
  // somebody reintroduces a credential to "save a round trip", this fails.
  expect(response.data.token).toBeUndefined();
  expect(response.data.expiresAt).toBeUndefined();
  expect(Object.keys(response.data).sort()).toEqual(['donor', 'message', 'status', 'statusCode']);
});

test('POST/feedbacks/donorLookup: the donor payload is exactly the nine public fields', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ address: 'SECRET ADDRESS', comment: 'SECRET COMMENT' });
  await operations.createDonor(donorInfo, signInResponse);

  const response = await operations.guestPost('/feedbacks/donorLookup', {
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

test('POST/feedbacks/donorLookup: every kind of mismatch answers identically', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  const wrongStudentId = await expectStatus(
    () => operations.guestPost('/feedbacks/donorLookup', { phone: donorInfo.phone, studentId: '1905999' }),
    404
  );
  const wrongPhone = await expectStatus(
    () => operations.guestPost('/feedbacks/donorLookup', { phone: uniquePhone(), studentId: donorInfo.studentId }),
    404
  );
  const neither = await expectStatus(
    () => operations.guestPost('/feedbacks/donorLookup', { phone: uniquePhone(), studentId: '1905998' }),
    404
  );

  // Byte-identical, compared to each other rather than to an expected string: anything that
  // distinguishes them turns the route into an oracle for probing which phone numbers exist.
  expect(JSON.stringify(wrongStudentId.data)).toEqual(JSON.stringify(wrongPhone.data));
  expect(JSON.stringify(wrongPhone.data)).toEqual(JSON.stringify(neither.data));
  expect(wrongStudentId.data.message).toBe('Information does not match. Please contact a volunteer.');
  expect(wrongStudentId.data.donor).toBeUndefined();
});

test('POST/feedbacks/donorLookup: one credential alone is a 400, not a 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  await expectStatus(() => operations.guestPost('/feedbacks/donorLookup', { phone: donorInfo.phone }), 400);
  await expectStatus(() => operations.guestPost('/feedbacks/donorLookup', { studentId: donorInfo.studentId }), 400);
  await expectStatus(() => operations.guestPost('/feedbacks/donorLookup', { phone: 123, studentId: 'abc' }), 400);
});

test('POST/feedbacks/donorLookup: a signed-in caller gets exactly the anonymous answer', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const credentials = { phone: donorInfo.phone, studentId: donorInfo.studentId };

  const anonymous = await operations.guestPost('/feedbacks/donorLookup', credentials);
  const signedIn = await operations.authedPost('/feedbacks/donorLookup', credentials, signInResponse);

  // There is no session branch on this route and there must not be one: it answers the same thing
  // to the notice board and to a volunteer's browser.
  expect(signedIn.status).toBe(anonymous.status);
  expect(signedIn.data.donor).toEqual(anonymous.data.donor);
});

test('POST/feedbacks/donorLookup: an (Unknown) donor is still found', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  // Created with a real hall and moved to (Unknown) by an edit, because a creation may no longer
  // name (Unknown). This is exactly how the records this test is about came to exist: they predate
  // the rule, and PATCH still accepts the hall so they stay editable.
  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  const creation = await operations.createDonor(donorInfo, signInResponse);
  await operations.updateDonor(
    {
      donorId: creation.data.newDonor._id,
      name: donorInfo.name,
      fatherName: donorInfo.fatherName,
      motherName: donorInfo.motherName,
      phone: donorInfo.phone,
      studentId: donorInfo.studentId,
      bloodGroup: donorInfo.bloodGroup,
      hall: HALLS_INDEX.UNKNOWN,
      roomNumber: donorInfo.roomNumber,
      address: donorInfo.address,
      availableToAll: donorInfo.availableToAll,
      email: '',
    },
    signInResponse
  );

  // (Unknown) is refused as a hall a registration CODE may be aimed at, and must stay legal as a
  // RECORDED one: this donor has no hall on file and is still entitled to the public page.
  const response = await operations.guestPost(
    '/feedbacks/donorLookup',
    { phone: donorInfo.phone, studentId: donorInfo.studentId },
    postDonorLookupSchema
  );

  expect(response.status).toBe(200);
  expect(response.data.donor.hall).toBe(HALLS_INDEX.UNKNOWN);
});

test('POST/feedbacks/donorLookup: nothing is logged', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  await operations.guestPost('/feedbacks/donorLookup', {
    phone: donorInfo.phone,
    studentId: donorInfo.studentId,
  });

  // There is no user id to log against, and inventing one would put a donor's phone number in the
  // log every time somebody opened the public page.
  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => String(l.operation).includes('LOOKUP'))).toHaveLength(0);
});
