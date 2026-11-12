const operations = require('../../lib/operations');
const { reviewMembersSchema, chatNotFoundSchema, listChatsSchema } = require('../schemas');
const {
  createVolunteer,
  createSuperAdmin,
  asSignIn,
  listChats,
  reviewMembers,
  deleteChatPermanently,
  seedChats,
  seedChat,
  inspectChat,
  sampleMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// DELETE /agent/review/chats/{chatId} — a super admin's delete, and the only PERMANENT one. The
// chat and every message leave the database; nothing can bring them back.

test('the chat and all its messages are removed from the database', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

  const response = await deleteChatPermanently(admin.token, seeded._id);
  expect(response.data.message).toBe('Chat deleted permanently');

  const stored = await inspectChat(seeded._id);
  expect(stored.chat).toBeNull();
  expect(stored.storedMessageCount).toBe(0);
});

test('a chat the member had already deleted can be deleted for good', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({
    owner: member.donorId,
    userDeletedChat: true,
    userDeletedAt: Date.now(),
    messages: sampleMessages(),
  });

  await deleteChatPermanently(admin.token, seeded._id);
  expect((await inspectChat(seeded._id)).chat).toBeNull();
});

test('a chat the member still had leaves their own list too', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const [kept, removed] = await seedChats([
    { owner: member.donorId, title: 'kept' },
    { owner: member.donorId, title: 'removed' },
  ]);

  await deleteChatPermanently(admin.token, removed._id);

  const list = await listChats(member.token, listChatsSchema);
  expect(list.data.chats.map((c) => c._id)).toEqual([kept._id]);
  await expectStatus(() => operations.authedGet(`/agent/chats/${removed._id}`, asSignIn(member.token)), 404);
});

test('deleting a member\'s last chat removes them from the members list; other chats are untouched', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const leaving = await createVolunteer(signInResponse);
  const staying = await createVolunteer(signInResponse);
  const [lastChat, otherChat] = await seedChats([
    { owner: leaving.donorId, userDeletedChat: true, userDeletedAt: Date.now() },
    { owner: staying.donorId, messages: sampleMessages() },
  ]);

  await deleteChatPermanently(admin.token, lastChat._id);

  const response = await reviewMembers(admin.token, reviewMembersSchema);
  expect(response.data.members.map((m) => m.donorId)).toEqual([staying.donorId]);
  expect((await inspectChat(otherChat._id)).storedMessageCount).toBe(sampleMessages().length);
});

test('deleting twice, or an unknown or malformed id, is a 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId });

  await deleteChatPermanently(admin.token, seeded._id);
  for (const chatId of [seeded._id, UNKNOWN_CHAT_ID, 'not-an-id']) {
    // eslint-disable-next-line no-await-in-loop
    const response = await expectStatus(() => deleteChatPermanently(admin.token, chatId), 404);
    operations.validateSchema(response.data, chatNotFoundSchema);
  }
});

test('a permanent delete is recorded in App Activity; a refused one is not', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse, { name: 'Deleting Admin' });
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

  await expectStatus(() => deleteChatPermanently(admin.token, UNKNOWN_CHAT_ID), 404);
  await deleteChatPermanently(admin.token, seeded._id);

  const logs = await operations.getLogs(signInResponse);
  const entries = logs.data.logs.filter((l) => l.operation === 'DELETE AGENT CHAT PERMANENTLY');
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe('Deleting Admin');
});
