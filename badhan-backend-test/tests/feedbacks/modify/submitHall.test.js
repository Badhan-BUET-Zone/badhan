const operations = require('../../lib/operations');
const { postFeedbackSchema, getFeedbacksSchema } = require('../schemas');
const {
  buildDonorInfo,
  buildNewDonorPayload,
  mintRegistrationToken,
  expectStatus,
} = require('../helpers');
const { HALLS_INDEX, HALL_ANY } = require('../../lib/utils/constants');

// Where a row's hall comes from. Three cases, and only the last is decided by the submitter:
//
//   type       token hall    row hall                   decided by
//   --------   -----------   ------------------------   -------------------------
//   feedback   (no token)    the matched donor's hall    the server, from a record
//   newDonor   a real hall   the token's                 the token
//   newDonor   HALL_ANY      feedbackJSON.hall           THE SUBMITTER
//
// A message carries no token at all, so its hall can only come from the record its credentials
// match. A hall-bearing registration token cannot be aimed by anything in the body.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

async function rowFor(studentId, signInResponse) {
  const list = await operations.authedGet('/feedbacks', signInResponse, getFeedbacksSchema);
  return list.data.feedbacks.find((row) => row.feedbackJSON.studentId === studentId);
}

test('POST/feedbacks: a hall-bearing token ignores the payload hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRegistrationToken(HALLS_INDEX.CHATRI, signInResponse);

  // A different hall in the body on purpose. The app's own form cannot send this any more, which is
  // exactly why the test must: the body is attacker-controlled and the token is not.
  const payload = buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR });
  await operations.guestPost(
    '/feedbacks',
    { token, type: 'newDonor', feedbackJSON: payload },
    postFeedbackSchema
  );

  const row = await rowFor(payload.studentId, signInResponse);
  expect(row.hall).toBe(HALLS_INDEX.CHATRI);
  // Still stored inside the JSON for the volunteer to read; it just has no effect on the column.
  expect(row.feedbackJSON.hall).toBe(HALLS_INDEX.TITUMIR);
});

test('POST/feedbacks: an All Halls token routes a registration by the payload hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRegistrationToken(HALL_ANY, signInResponse);

  const payload = buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR });
  const response = await operations.guestPost(
    '/feedbacks',
    { token, type: 'newDonor', feedbackJSON: payload },
    postFeedbackSchema
  );

  expect(response.status).toBe(201);
  const row = await rowFor(payload.studentId, signInResponse);
  expect(row.hall).toBe(HALLS_INDEX.TITUMIR);
});

test('POST/feedbacks: one All Halls token sends two registrations to two different halls', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRegistrationToken(HALL_ANY, signInResponse);

  const first = buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR });
  const second = buildNewDonorPayload({ hall: HALLS_INDEX.AHSANULLAH });
  await operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: first });
  await operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: second });

  // Two halls, two rows, one token. This is what pins that the token genuinely is not deciding.
  expect((await rowFor(first.studentId, signInResponse)).hall).toBe(HALLS_INDEX.TITUMIR);
  expect((await rowFor(second.studentId, signInResponse)).hall).toBe(HALLS_INDEX.AHSANULLAH);
});

test('POST/feedbacks: an All Halls token cannot store HALL_ANY as a registration hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRegistrationToken(HALL_ANY, signInResponse);

  const payload = buildNewDonorPayload({ hall: HALL_ANY });
  await expectStatus(
    () => operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: payload }),
    400
  );

  // The payload validator refuses -1 in this field, and that refusal is what makes the branch safe.
  // Assert the absence, not just the status.
  const row = await rowFor(payload.studentId, signInResponse);
  expect(row).toBeUndefined();
});

test("POST/feedbacks: a message routes by the donor's own hall, with no token in sight", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.NAZRUL });
  await operations.createDonor(donorInfo, signInResponse);

  await operations.guestPost(
    '/feedbacks',
    {
      type: 'feedback',
      feedbackJSON: {
        phone: donorInfo.phone,
        studentId: donorInfo.studentId,
        text: 'routed by my own hall',
      },
    },
    postFeedbackSchema
  );

  // Off a database record, not off the body — the route fetched this donor to check the pair
  // exists, so its hall is the only thing it can route by and the submitter cannot aim it. There
  // is no longer any token that could disagree with the record.
  const row = await rowFor(donorInfo.studentId, signInResponse);
  expect(row.hall).toBe(HALLS_INDEX.NAZRUL);
});

test('POST/feedbacks: a message naming nobody is refused and writes no row', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const stranger = buildDonorInfo();
  await expectStatus(
    () => operations.guestPost('/feedbacks', {
      type: 'feedback',
      feedbackJSON: { phone: stranger.phone, studentId: stranger.studentId, text: 'nobody' },
    }),
    404
  );

  const row = await rowFor(stranger.studentId, signInResponse);
  expect(row).toBeUndefined();
});

test('POST/feedbacks: no row anywhere carries HALL_ANY', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const anyToken = await mintRegistrationToken(HALL_ANY, signInResponse);
  const hallToken = await mintRegistrationToken(HALLS_INDEX.CHATRI, signInResponse);

  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.NAZRUL });
  await operations.createDonor(donorInfo, signInResponse);
  await operations.guestPost('/feedbacks', {
    type: 'feedback',
    feedbackJSON: { phone: donorInfo.phone, studentId: donorInfo.studentId, text: 'one' },
  });
  await operations.guestPost('/feedbacks', {
    token: anyToken,
    type: 'newDonor',
    feedbackJSON: buildNewDonorPayload({ hall: HALLS_INDEX.SUHRAWARDY }),
  });
  await operations.guestPost('/feedbacks', {
    token: hallToken,
    type: 'newDonor',
    feedbackJSON: buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR }),
  });

  const list = await operations.authedGet('/feedbacks', signInResponse, getFeedbacksSchema);
  expect(list.data.feedbacks.length).toBeGreaterThan(0);
  // HALL_ANY is a property of a code and never of a row. If it ever reaches the collection, the
  // visibility rule stops meaning anything for that row.
  expect(list.data.feedbacks.map((row) => row.hall)).not.toContain(HALL_ANY);
});

test('POST/feedbacks: a row still has exactly four fields under an All Halls token', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRegistrationToken(HALL_ANY, signInResponse);

  const payload = buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR });
  await operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: payload });

  const row = await rowFor(payload.studentId, signInResponse);
  expect(Object.keys(row).sort()).toEqual(['_id', 'date', 'donor', 'feedbackJSON', 'hall', 'type']);
});
