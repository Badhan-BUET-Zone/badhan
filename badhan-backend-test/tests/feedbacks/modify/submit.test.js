const operations = require('../../lib/operations');
const { postFeedbackSchema } = require('../schemas');
const {
  buildDonorInfo,
  buildNewDonorPayload,
  mintToken,
  expectStatus,
} = require('../helpers');
const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// POST /feedbacks — the one write the public side can perform. The body's `type` decides everything;
// the token decides only the hall.

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

test('POST/feedbacks: a message writes one row carrying the token hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  const response = await operations.guestPost(
    '/feedbacks',
    {
      token,
      type: 'feedback',
      feedbackJSON: {
        phone: donorInfo.phone,
        studentId: donorInfo.studentId,
        text: 'I donated on 12 March',
      },
    },
    postFeedbackSchema
  );

  expect(response.status).toBe(201);
  expect(response.data.message).toBe('Thank you. Your message has reached the volunteers.');

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.studentId === donorInfo.studentId);
  expect(row.type).toBe('feedback');
  expect(row.hall).toBe(donorInfo.hall);
  // Four columns and an id. Phone and student ID live inside feedbackJSON, never as columns.
  expect(Object.keys(row).sort()).toEqual(['_id', 'date', 'donor', 'feedbackJSON', 'hall', 'type']);
});

test('POST/feedbacks: message text is stored byte-identical', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  // Apostrophes, Bangla and a newline. This is the test that catches a stray .escape() — the message
  // exists to be read verbatim by a human.
  const text = "I can't donate — বাংলা & \"quotes\"\nsecond line";
  await operations.guestPost('/feedbacks', {
    token,
    type: 'feedback',
    feedbackJSON: { phone: donorInfo.phone, studentId: donorInfo.studentId, text },
  });

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.studentId === donorInfo.studentId);
  expect(row.feedbackJSON.text).toBe(text);
});

test("POST/feedbacks: a registration's name is escaped exactly once", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  const payload = buildNewDonorPayload({ name: "O'Brien", comment: "it's fine" });
  await operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: payload });

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.studentId === payload.studentId);

  // Escaped once, not twice. These fields become a donor through the creation route, which escapes
  // them itself; the frontend decodes once at each read boundary. Paired with the byte-identical
  // test above, this is what stops the two rules being merged.
  expect(row.feedbackJSON.name).toBe('O&#x27;Brien');
  expect(row.feedbackJSON.comment).toBe('it&#x27;s fine');
});

test('POST/feedbacks: the hall comes from the token even when the body disagrees', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  // A different hall in the body, deliberately. The app's own form can no longer do this, which is
  // exactly why the test must: the body is attacker-controlled and the token is not.
  const payload = buildNewDonorPayload({ hall: HALLS_INDEX.TITUMIR });
  await operations.guestPost('/feedbacks', { token, type: 'newDonor', feedbackJSON: payload });

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.studentId === payload.studentId);
  expect(row.hall).toBe(HALLS_INDEX.CHATRI);
  expect(row.feedbackJSON.hall).toBe(HALLS_INDEX.TITUMIR);
});

test('POST/feedbacks: a message must name a real donor, a registration must not', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  const strangerPhone = uniquePhone();

  // The same pair, the opposite answer. This is why `type` is on the body at all.
  await expectStatus(
    () =>
      operations.guestPost('/feedbacks', {
        token,
        type: 'feedback',
        feedbackJSON: { phone: strangerPhone, studentId: '1905997', text: 'ghost' },
      }),
    404
  );

  const registration = await operations.guestPost('/feedbacks', {
    token,
    type: 'newDonor',
    feedbackJSON: buildNewDonorPayload({ phone: strangerPhone, studentId: '1905997' }),
  });
  expect(registration.status).toBe(201);
});

test('POST/feedbacks: one token files both kinds, and creates no donor', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  const payload = buildNewDonorPayload();

  const message = await operations.guestPost('/feedbacks', {
    token,
    type: 'feedback',
    feedbackJSON: { phone: donorInfo.phone, studentId: donorInfo.studentId, text: 'both kinds' },
  });
  const registration = await operations.guestPost('/feedbacks', {
    token,
    type: 'newDonor',
    feedbackJSON: payload,
  });

  // There is no cross-purpose barrier: the token never constrained which kind of submission it
  // files, and re-introducing one has to be a visible change rather than an accident.
  expect(message.status).toBe(201);
  expect(registration.status).toBe(201);

  // A registration creates a row, never a donor — minting for its details still 404s.
  await expectStatus(
    () => operations.guestPost('/feedbacks/token', { phone: payload.phone, studentId: payload.studentId }),
    404
  );
});

test('POST/feedbacks: bad tokens and bad payloads are refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);
  const message = { phone: donorInfo.phone, studentId: donorInfo.studentId, text: 'hello' };

  // A real session token is correctly signed with the same secret — only its shape gives it away.
  await expectStatus(
    () =>
      operations.guestPost('/feedbacks', {
        token: signInResponse.data.token,
        type: 'feedback',
        feedbackJSON: message,
      }),
    401
  );
  await expectStatus(
    () => operations.guestPost('/feedbacks', { token: 'not.a.jwt', type: 'feedback', feedbackJSON: message }),
    401
  );
  await expectStatus(
    () => operations.guestPost('/feedbacks', { token, type: 'somethingElse', feedbackJSON: message }),
    400
  );
  await expectStatus(
    () =>
      operations.guestPost('/feedbacks', {
        token,
        type: 'feedback',
        feedbackJSON: { ...message, extra: 'unknown key' },
      }),
    400
  );
  await expectStatus(
    () =>
      operations.guestPost('/feedbacks', {
        token,
        type: 'feedback',
        feedbackJSON: { ...message, text: 'x'.repeat(501) },
      }),
    400
  );
  // Over 4 KB after escaping, which is why the size is checked on the normalised payload: the
  // schema's own guard would otherwise fail the insert as a 500 rather than a 400.
  await expectStatus(
    () =>
      operations.guestPost('/feedbacks', {
        token,
        type: 'newDonor',
        feedbackJSON: buildNewDonorPayload({ comment: 'x'.repeat(600) }),
      }),
    400
  );
});

test('POST/feedbacks: a registration naming (Unknown) or Attached is refused', async () => {
  // A registration is a creation, so the payload takes the creation set — the seven halls only.
  // Under an All Halls token this value also decides the row's hall column, so the narrowing keeps
  // (Unknown) out of the queue as well as out of the draft.
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);

  for (const hall of [HALLS_INDEX.UNKNOWN, HALLS_INDEX.ATTACHED]) {
    await expectStatus(
      () =>
        operations.guestPost('/feedbacks', {
          token,
          type: 'newDonor',
          feedbackJSON: buildNewDonorPayload({ hall }),
        }),
      400
    );
  }
});
