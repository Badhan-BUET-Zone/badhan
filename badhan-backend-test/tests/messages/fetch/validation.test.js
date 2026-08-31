const operations = require('../../lib/operations');
const { getMessagesSchema } = require('../schemas');
const { createVolunteer, fetchMessages, seedMessages, expectStatus } = require('../helpers');

// The cross-field rules of the three reads, and the one parameter that is clamped rather than
// refused.

const asSignIn = (token) => ({ data: { token } });

const expectBadRequest = (token, query) =>
  expectStatus(() => operations.authedGet(`/messages${query}`, asSignIn(token)), 400);

test('GET/messages: after and before together are refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // Two cursors describe two different reads. Honouring one and ignoring the other would make
  // which one wins an implementation detail the client cannot see.
  const response = await expectBadRequest(
    token,
    '?after=1700000000000&before=1700000000000&beforeId=5e6b8b3f1c9d440000a1b2c3'
  );
  expect(response.data.message).toMatch(/after cannot be combined/i);
});

test('GET/messages: after combined with a lone beforeId is refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await expectBadRequest(token, '?after=1700000000000&beforeId=5e6b8b3f1c9d440000a1b2c3');
});

test('GET/messages: before without beforeId is refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // A lone `before` names a millisecond rather than a message, and a boundary landing inside a
  // shared millisecond then skips one forever. Refused rather than silently degraded.
  const response = await expectBadRequest(token, '?before=1700000000000');
  expect(response.data.message).toMatch(/before and beforeId must be sent together/i);
});

test('GET/messages: beforeId without before is refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await expectBadRequest(token, '?beforeId=5e6b8b3f1c9d440000a1b2c3');
});

test('GET/messages: a malformed cursor is a 400, not a 500', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  await expectBadRequest(token, '?after=notanumber');
  await expectBadRequest(token, '?before=1700000000000&beforeId=notanobjectid');
  // Before the year 2000 is not a timestamp this schema set recognises anywhere.
  await expectBadRequest(token, '?after=5');
});

test('GET/messages: limit above the cap is CLAMPED, never rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 12);

  // An out-of-range limit is a client asking for more than it may have, not a malformed
  // request — answering 400 would break a scroll mid-gesture.
  const response = await fetchMessages(token, '?limit=500', getMessagesSchema);
  expect(response.data.messages.length).toBe(12);
});

test('GET/messages: limit is honoured below the cap, and a zero or negative limit still returns a page', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 12);

  const small = await fetchMessages(token, '?limit=4', getMessagesSchema);
  expect(small.data.messages.length).toBe(4);
  expect(small.data.hasMore).toBe(true);

  // Clamped up to 1 rather than refused, and rather than becoming an unbounded query.
  const zero = await fetchMessages(token, '?limit=0', getMessagesSchema);
  expect(zero.data.messages.length).toBe(1);
  const negative = await fetchMessages(token, '?limit=-5', getMessagesSchema);
  expect(negative.data.messages.length).toBe(1);
});

test('GET/messages: an unknown query parameter does not widen or narrow the page', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 6);

  const plain = await fetchMessages(token, '', getMessagesSchema);
  // The room is global. A ?hall= filter has to be a deliberate addition backed by a plan, not a
  // parameter that silently starts being honoured.
  const filtered = await fetchMessages(token, '?hall=1', getMessagesSchema);
  expect(filtered.data.messages.length).toBe(plain.data.messages.length);
});
