const operations = require('../../lib/operations');
const { deleteChatSchema, listChatsSchema } = require('../schemas');
const {
  createVolunteer,
  createSuperAdmin,
  asSignIn,
  deleteChat,
  listChats,
  seedChats,
  seedChat,
  inspectChat,
  sampleMessages,
  expectStatus,
} = require('../helpers');

// DELETE /agent/chats/{chatId} — the member's delete, which is a SOFT delete. The chat leaves the
// member's view everywhere, and it and its messages stay in the database until a super admin
// deletes it permanently. The member is not told; the response reads like any delete.

test('DELETE/agent/chats/{chatId}: the chat leaves the member\'s list', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const [kept, removed] = await seedChats([
    { owner: me.donorId, title: 'kept' },
    { owner: me.donorId, title: 'removed', messages: sampleMessages() },
  ]);

  const response = await deleteChat(me.token, removed._id, deleteChatSchema);
  expect(response.data.message).toBe('Chat deleted successfully');

  const list = await listChats(me.token, listChatsSchema);
  expect(list.data.chats.map((c) => c._id)).toEqual([kept._id]);
  await expectStatus(() => operations.authedGet(`/agent/chats/${removed._id}`, asSignIn(me.token)), 404);
});

test('DELETE/agent/chats/{chatId}: the chat and every message are still in the database, flagged', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId, title: 'kept for review', messages: sampleMessages() });

  const before = Date.now();
  await deleteChat(me.token, seeded._id, deleteChatSchema);
  const after = Date.now();

  const stored = await inspectChat(seeded._id);
  expect(stored.chat).not.toBeNull();
  expect(stored.chat.title).toBe('kept for review');
  expect(stored.chat.userDeletedChat).toBe(true);
  expect(stored.chat.userDeletedAt).toBeGreaterThanOrEqual(before);
  expect(stored.chat.userDeletedAt).toBeLessThanOrEqual(after);
  expect(stored.storedMessageCount).toBe(sampleMessages().length);
  expect(stored.chat.messageCount).toBe(sampleMessages().length);
});

test('DELETE/agent/chats/{chatId}: deleting twice is a 404, and the first date stands', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId });

  await deleteChat(me.token, seeded._id, deleteChatSchema);
  const firstDate = (await inspectChat(seeded._id)).chat.userDeletedAt;

  await expectStatus(() => operations.authedDelete(`/agent/chats/${seeded._id}`, asSignIn(me.token)), 404);
  expect((await inspectChat(seeded._id)).chat.userDeletedAt).toBe(firstDate);
});

test('DELETE/agent/chats/{chatId}: a super admin\'s delete on their own page is soft as well', async () => {
  // Permanent delete exists only on the review page.
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const seeded = await seedChat({ owner: admin.donorId, messages: sampleMessages() });

  await deleteChat(admin.token, seeded._id, deleteChatSchema);

  const stored = await inspectChat(seeded._id);
  expect(stored.chat.userDeletedChat).toBe(true);
  expect(stored.storedMessageCount).toBe(sampleMessages().length);
});

test('DELETE/agent/chats/{chatId}: another member cannot delete it, and it is untouched', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const owner = await createVolunteer(signInResponse);
  const intruder = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: owner.donorId });

  await expectStatus(() => operations.authedDelete(`/agent/chats/${seeded._id}`, asSignIn(intruder.token)), 404);

  const stored = await inspectChat(seeded._id);
  expect(stored.chat.userDeletedChat).toBe(false);
  expect(stored.chat.userDeletedAt).toBeNull();
});

test('DELETE/agent/chats/{chatId}: the delete is recorded in the activity log', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId });

  await deleteChat(me.token, seeded._id, deleteChatSchema);

  const logs = await operations.getLogs(signInResponse);
  const entry = logs.data.logs.find((l) => l.operation === 'DELETE AGENT CHAT');
  expect(entry).toBeDefined();
  // Attributed to the member who deleted it. The details ({ chatId }) are not served by any
  // route, so a suite can pin that the row is written but not what it carries.
  expect(entry.name).toBe(me.donorInfo.name);
});

test('DELETE/agent/chats/{chatId}: a refused delete writes no log row', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const owner = await createVolunteer(signInResponse);
  const intruder = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: owner.donorId });

  await expectStatus(() => operations.authedDelete(`/agent/chats/${seeded._id}`, asSignIn(intruder.token)), 404);

  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'DELETE AGENT CHAT')).toHaveLength(0);
});
