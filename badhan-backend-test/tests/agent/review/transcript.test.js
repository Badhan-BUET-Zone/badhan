const operations = require('../../lib/operations');
const { reviewTranscriptSchema, reviewMemberChatsSchema, chatNotFoundSchema } = require('../schemas');
const {
  createVolunteer,
  createSuperAdmin,
  reviewChat,
  reviewMemberChats,
  seedChat,
  sampleMessages,
  recordedParts,
  recordedMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// GET /agent/review/chats/{chatId} — any chat's whole transcript, for a super admin.

test('another member\'s chat: the transcript in order, with its owner', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse, { name: 'Transcript Owner' });
  const seeded = await seedChat({ owner: member.donorId, title: 'O+ in Ahsanullah', messages: sampleMessages() });

  const response = await reviewChat(admin.token, seeded._id, reviewTranscriptSchema);
  expect(response.data.chat).toMatchObject({ _id: seeded._id, owner: member.donorId, title: 'O+ in Ahsanullah', userDeletedChat: false });
  expect(response.data.member.name).toBe('Transcript Owner');
  expect(response.data.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
  expect(response.data.messages[2].run.label).toBe('Search for donors filtered by criteria');
});

test('a chat the member deleted can still be read, with its deleted flag and date', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const deletedAt = Date.now() - 1000;
  const seeded = await seedChat({ owner: member.donorId, userDeletedChat: true, userDeletedAt: deletedAt, messages: sampleMessages() });

  const response = await reviewChat(admin.token, seeded._id, reviewTranscriptSchema);
  expect(response.data.chat.userDeletedChat).toBe(true);
  expect(response.data.chat.userDeletedAt).toBe(deletedAt);
  expect(response.data.messages).toHaveLength(sampleMessages().length);
});

test('failed model calls and the call records are left out: they are in the download only', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, requestParts: recordedParts(), messages: recordedMessages() });

  // Both schemas allow no extra key: requestParts on the chat and modelCall on a message would fail them.
  const transcript = await reviewChat(admin.token, seeded._id, reviewTranscriptSchema);
  expect(transcript.data.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);

  await reviewMemberChats(admin.token, member.donorId, reviewMemberChatsSchema);
});

test('a chat whose owner\'s donor record is gone: member is null', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const seeded = await seedChat({ owner: '5e6b8b3f1c9d440000a1b2c4', messages: sampleMessages() });

  const response = await reviewChat(admin.token, seeded._id, reviewTranscriptSchema);
  expect(response.data.member).toBeNull();
});

test('an unknown or malformed chat id is a 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);

  for (const chatId of [UNKNOWN_CHAT_ID, 'not-an-id']) {
    // eslint-disable-next-line no-await-in-loop
    const response = await expectStatus(() => reviewChat(admin.token, chatId), 404);
    operations.validateSchema(response.data, chatNotFoundSchema);
  }
});

test('opening a transcript is recorded in App Activity, under the super admin who opened it', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse, { name: 'Curious Admin' });
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

  await reviewChat(admin.token, seeded._id);

  const logs = await operations.getLogs(signInResponse);
  const entries = logs.data.logs.filter((l) => l.operation === 'GET AGENT CHAT (REVIEW)');
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe('Curious Admin');
  // The details ({ chatId, ownerId }) are not served by any route, so a suite can pin that the row
  // is written and by whom, but not what it carries.
});

test('a 404 writes no App Activity row', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);

  await expectStatus(() => reviewChat(admin.token, UNKNOWN_CHAT_ID), 404);

  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'GET AGENT CHAT (REVIEW)')).toHaveLength(0);
});
