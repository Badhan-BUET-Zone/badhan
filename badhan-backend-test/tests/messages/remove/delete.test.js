const operations = require('../../lib/operations');
const { deleteMessageSchema, getMessagesSchema, postMessageSchema } = require('../schemas');
const {
  createVolunteer,
  createHallAdmin,
  sendMessage,
  fetchMessages,
  deleteMessage,
  expectStatus,
} = require('../helpers');

// DELETE /messages?messageId=<id> — author or Super Admin, and nobody else.

const asSignIn = (token) => ({ data: { token } });

const expectDeleteRejected = (token, messageId, status) =>
  expectStatus(() => operations.authedDelete(`/messages?messageId=${messageId}`, asSignIn(token)), status);

// A super admin who can also send, so a Super-Admin-deletes-their-own case is available.
async function createSuperAdmin(signInResponse) {
  const { donorId, token, donorInfo } = await createVolunteer(signInResponse);
  await operations.promoteToSuperAdmin(donorId, signInResponse);
  return { donorId, token, donorInfo };
}

test('DELETE/messages: requires a session', async () => {
  await expectStatus(() => operations.guestDelete('/messages?messageId=5e6b8b3f1c9d440000a1b2c3'), 401);
});

test('DELETE/messages: the author may delete their own message', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const sent = (await sendMessage(token, 'mine to remove', postMessageSchema)).data.sentMessage;
  const response = await deleteMessage(token, sent._id, deleteMessageSchema);

  expect(response.status).toBe(200);
  const room = await fetchMessages(token, '', getMessagesSchema);
  expect(room.data.messages).toEqual([]);
});

test('DELETE/messages: a Super Admin may delete anybody\'s message', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const author = await createVolunteer(signInResponse);
  const admin = await createSuperAdmin(signInResponse);

  const sent = (await sendMessage(author.token, 'moderated away', postMessageSchema)).data.sentMessage;
  const response = await deleteMessage(admin.token, sent._id, deleteMessageSchema);

  expect(response.status).toBe(200);
  const room = await fetchMessages(author.token, '', getMessagesSchema);
  expect(room.data.messages.map((m) => m.text)).not.toContain('moderated away');
});

test('DELETE/messages: a Hall Admin may NOT delete someone else\'s message', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const author = await createVolunteer(signInResponse);
  const hallAdmin = await createHallAdmin(signInResponse);

  const sent = (await sendMessage(author.token, 'not the hall admin\'s to remove', postMessageSchema))
    .data.sentMessage;

  // The room is not scoped by hall, so a hall admin has no standing over it. This is the one
  // designation rule in the feature that is NOT "higher rank wins".
  const response = await expectDeleteRejected(hallAdmin.token, sent._id, 403);
  expect(response.data.message).toMatch(/only delete your own messages/i);

  // And the row survived the refusal.
  const room = await fetchMessages(author.token, '', getMessagesSchema);
  expect(room.data.messages.length).toBe(1);
});

test('DELETE/messages: another Volunteer may not delete a message either', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const author = await createVolunteer(signInResponse);
  const peer = await createVolunteer(signInResponse);

  const sent = (await sendMessage(author.token, 'peer may not touch this', postMessageSchema))
    .data.sentMessage;
  await expectDeleteRejected(peer.token, sent._id, 403);
});

test('DELETE/messages: deleting an already-deleted message is 404, and so is a race', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const author = await createVolunteer(signInResponse);
  const peer = await createVolunteer(signInResponse);

  const sent = (await sendMessage(author.token, 'delete me twice', postMessageSchema)).data.sentMessage;
  await deleteMessage(author.token, sent._id, deleteMessageSchema);

  const second = await expectDeleteRejected(author.token, sent._id, 404);
  expect(second.data.message).toMatch(/already been deleted/i);

  // GONE IS CHECKED BEFORE "NOT YOURS". A non-author asking about a message that no longer
  // exists is told it is gone, never that it was not theirs — the other order would leak who
  // wrote something the asker can no longer see.
  const byNonAuthor = await expectDeleteRejected(peer.token, sent._id, 404);
  expect(byNonAuthor.data.message).toMatch(/already been deleted/i);
});

test('DELETE/messages: an id that never existed is 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await expectDeleteRejected(token, '5e6b8b3f1c9d440000a1b2c3', 404);
});

test('DELETE/messages: a missing or malformed messageId is 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  await expectStatus(() => operations.authedDelete('/messages', asSignIn(token)), 400);
  await expectDeleteRejected(token, 'not-an-object-id', 400);
});

test('DELETE/messages: messageId travels as a QUERY parameter, not a path segment', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  const sent = (await sendMessage(token, 'query parameter please', postMessageSchema)).data.sentMessage;

  // The convention every delete in this codebase follows but ActiveDonors. A path-param route
  // would be a 404 here, and pinning it stops the route drifting to the lone exception.
  await expectStatus(() => operations.authedDelete(`/messages/${sent._id}`, asSignIn(token)), 404);
  const response = await deleteMessage(token, sent._id, deleteMessageSchema);
  expect(response.status).toBe(200);
});

test('DELETE/messages: a delete is recorded in the activity log', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const sent = (await sendMessage(token, 'recoverable from the log', postMessageSchema)).data.sentMessage;
  await deleteMessage(token, sent._id, deleteMessageSchema);

  const logs = await operations.getLogs(signInResponse);
  const entry = logs.data.logs.find((l) => l.operation === 'DELETE MESSAGES');

  // The delete is hard and leaves no tombstone in the room, so this row is the only thing that
  // survives it — the same bargain the feedback discard makes.
  expect(entry).toBeDefined();

  // WHAT IS NOT ASSERTED HERE, AND WHY. The handler writes { messageId, senderId, text, date }
  // into the log's `details`, which is what makes a removed message recoverable. GET /log
  // projects only name, hall, date and operation — no route in the API exposes `details` at
  // all — so an end-to-end suite can pin that the row is written but not what it carries.
  // Asserting the payload needs a route that serves it; do not fake one for a test.
  expect(entry.operation).toBe('DELETE MESSAGES');
});

test('DELETE/messages: a send is recorded in the activity log', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorInfo } = await createVolunteer(signInResponse);
  await sendMessage(token, 'body stays out of the log', postMessageSchema);

  const logs = await operations.getLogs(signInResponse);
  const entry = logs.data.logs.find((l) => l.operation === 'POST MESSAGES');

  expect(entry).toBeDefined();
  // Attributed to the sender rather than to whoever happened to be signed in.
  expect(entry.name).toBe(donorInfo.name);
  // The details it carries — { messageId, length } and deliberately NOT the body — are
  // unreachable from here for the reason recorded in the test above.
});

test('DELETE/messages: a deleted message leaves no tombstone in the room', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const keep = await sendMessage(token, 'kept', postMessageSchema);
  const remove = await sendMessage(token, 'removed', postMessageSchema);
  await deleteMessage(token, remove.data.sentMessage._id, deleteMessageSchema);

  const room = await fetchMessages(token, '', getMessagesSchema);
  // No placeholder, no "message was deleted" row, no gap marker. Nobody fetching afterwards
  // sees any trace of it.
  expect(room.data.messages.map((m) => m.text)).toEqual(['kept']);
  expect(room.data.messages[0]._id).toBe(keep.data.sentMessage._id);
});
