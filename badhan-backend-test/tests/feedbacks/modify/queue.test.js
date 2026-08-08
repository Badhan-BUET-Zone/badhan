const operations = require('../../lib/operations');
const flows = require('../../lib/flows');
const { getFeedbacksSchema, deleteFeedbackSchema } = require('../schemas');
const { buildDonorInfo, mintToken, expectStatus } = require('../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// GET and DELETE /feedbacks — the volunteer-facing half, and the visibility rule that is the one
// thing this phase has to get right.

async function seedMessage(donorInfo, text) {
  const token = await mintToken(donorInfo.phone, donorInfo.studentId);
  return operations.guestPost('/feedbacks', {
    token,
    type: 'feedback',
    feedbackJSON: { phone: donorInfo.phone, studentId: donorInfo.studentId, text },
  });
}

// A sign-in per test, not per file: setup-after-env purges the database between tests, which drops
// the Tokens row a cached session depends on. Every other suite here does the same.

test('GET/feedbacks: requires a session', async () => {
  await expectStatus(() => operations.guestGet('/feedbacks'), 401);
});

test('GET/feedbacks: rows carry a donor card, or null, and never a password', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  await seedMessage(donorInfo, 'card please');

  const list = await operations.authedGet('/feedbacks', signInResponse, getFeedbacksSchema);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.studentId === donorInfo.studentId);

  expect(row.donor).not.toBeNull();
  expect(row.donor.name).toBe(donorInfo.name);
  // The card is projected by inclusion, so these are absent because nobody named them rather than
  // because somebody remembered to exclude them.
  expect(row.donor.password).toBeUndefined();
  expect(row.donor.email).toBeUndefined();
  expect(row.donor.designation).toBeUndefined();
});

test('GET/feedbacks: a volunteer never receives another hall\'s row', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // A donor of another hall, deliberately NOT availableToAll — one marked available to all halls is
  // visible to everyone by design, so it would test nothing.
  const otherHallDonor = buildDonorInfo({ hall: HALLS_INDEX.TITUMIR, availableToAll: false });
  await operations.createDonor(otherHallDonor, signInResponse);
  await seedMessage(otherHallDonor, 'from another hall');

  const volunteerInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  const { volunteerToken } = await flows.createVolunteerWithToken(volunteerInfo, signInResponse);

  const list = await operations.authedGet('/feedbacks', { data: { token: volunteerToken } });
  const texts = list.data.feedbacks.map((f) => f.feedbackJSON.text);

  // Absent from the array, not a 403: another hall's row must never reach the browser at all, so
  // there is nothing to grey out.
  expect(texts).not.toContain('from another hall');
});

test('GET/feedbacks: an availableToAll donor is visible to every hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const openDonor = buildDonorInfo({ hall: HALLS_INDEX.TITUMIR, availableToAll: true });
  await operations.createDonor(openDonor, signInResponse);
  await seedMessage(openDonor, 'available to all halls');

  const volunteerInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  const { volunteerToken } = await flows.createVolunteerWithToken(volunteerInfo, signInResponse);

  const list = await operations.authedGet('/feedbacks', { data: { token: volunteerToken } });
  expect(list.data.feedbacks.map((f) => f.feedbackJSON.text)).toContain('available to all halls');
});

test('GET/feedbacks: oldest first, and no query parameter widens the list', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);

  await seedMessage(donorInfo, 'first');
  await seedMessage(donorInfo, 'second');

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const dates = list.data.feedbacks.map((f) => f.date);
  expect([...dates].sort((a, b) => a - b)).toEqual(dates);

  // The queue is one list. A ?type= filter has to be a deliberate addition, not a parameter that
  // silently starts being honoured.
  const filtered = await operations.authedGet('/feedbacks?type=newDonor', signInResponse);
  expect(filtered.data.feedbacks.length).toBe(list.data.feedbacks.length);
});

test('DELETE/feedbacks: discards the row, logs the whole submission, and touches no donor', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  const creation = await operations.createDonor(donorInfo, signInResponse);
  const donorId = creation.data.newDonor._id;
  await seedMessage(donorInfo, 'discard me');

  const before = await operations.getDonor(donorId, signInResponse);

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.text === 'discard me');

  const discard = await operations.authedDelete(
    `/feedbacks?feedbackId=${row._id}`,
    signInResponse,
    deleteFeedbackSchema
  );
  expect(discard.status).toBe(200);

  const after = await operations.authedGet('/feedbacks', signInResponse);
  expect(after.data.feedbacks.map((f) => f._id)).not.toContain(row._id);

  // Discard deletes the row and nothing else.
  const donorAfter = await operations.getDonor(donorId, signInResponse);
  expect(JSON.stringify(donorAfter.data.donor)).toEqual(JSON.stringify(before.data.donor));

  // The discard is logged. The full submission goes into that row's `details`, but NO ROUTE
  // RETURNS `details` — GET /log projects only name, hall, date and operation — so the strongest
  // thing assertable from outside is that the operation was recorded. Recovering a discarded
  // message needs direct database access, which is worth knowing before promising otherwise.
  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.map((log) => log.operation)).toContain('DELETE FEEDBACKS');
});

test('DELETE/feedbacks: a second discard is a calm 404, and a bad id is a 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  await operations.createDonor(donorInfo, signInResponse);
  await seedMessage(donorInfo, 'discard twice');

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.text === 'discard twice');

  await operations.authedDelete(`/feedbacks?feedbackId=${row._id}`, signInResponse);

  // Two volunteers working the queue at once is the expected case, not an error: the first wins and
  // the second is told plainly. Gone is checked before not-yours, so this is never a 403.
  const second = await expectStatus(
    () => operations.authedDelete(`/feedbacks?feedbackId=${row._id}`, signInResponse),
    404
  );
  expect(second.data.message).toBe('This feedback has already been resolved.');

  await expectStatus(
    () => operations.authedDelete('/feedbacks?feedbackId=nonsense', signInResponse),
    400
  );
});

test('DELETE/feedbacks: a volunteer cannot discard another hall\'s row', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const otherHallDonor = buildDonorInfo({ hall: HALLS_INDEX.TITUMIR, availableToAll: false });
  await operations.createDonor(otherHallDonor, signInResponse);
  await seedMessage(otherHallDonor, 'not yours to discard');

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.text === 'not yours to discard');

  const volunteerInfo = buildDonorInfo({ hall: HALLS_INDEX.CHATRI });
  const { volunteerToken } = await flows.createVolunteerWithToken(volunteerInfo, signInResponse);

  await expectStatus(
    () => operations.authedDelete(`/feedbacks?feedbackId=${row._id}`, { data: { token: volunteerToken } }),
    403
  );

  // ...and the row is still there afterwards.
  const after = await operations.authedGet('/feedbacks', signInResponse);
  expect(after.data.feedbacks.map((f) => f._id)).toContain(row._id);
});

test('deleting a donor leaves their feedback in the queue', async () => {
  // The cascade on donor deletion is deliberately not extended to Feedbacks: a feedback row has no
  // donor id to match on, and the page has to render a donor-less row anyway. This is the test that
  // pins a decision somebody will otherwise "fix".
  const signInResponse = await operations.signInSuperAdmin();
  const donorInfo = buildDonorInfo();
  const creation = await operations.createDonor(donorInfo, signInResponse);
  await seedMessage(donorInfo, 'my donor will be deleted');

  await operations.deleteDonor(creation.data.newDonor._id, signInResponse);

  const list = await operations.authedGet('/feedbacks', signInResponse);
  const row = list.data.feedbacks.find((f) => f.feedbackJSON.text === 'my donor will be deleted');

  expect(row).toBeDefined();
  expect(row.donor).toBeNull();
});
