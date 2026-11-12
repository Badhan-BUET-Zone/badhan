const operations = require('../../lib/operations');
const { renameChatSchema, listChatsSchema } = require('../schemas');
const { createVolunteer, asSignIn, renameChat, listChats, seedChat, expectStatus } = require('../helpers');

// PATCH /agent/chats/{chatId} — { title }, 1 to 100 characters after trimming, and nothing else.

test('PATCH/agent/chats/{chatId}: a rename is returned and shows in the list', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId, title: 'first line of the first message' });

  const response = await renameChat(me.token, seeded._id, { title: 'Blood for Rahim' }, renameChatSchema);
  expect(response.data.chat.title).toBe('Blood for Rahim');

  const list = await listChats(me.token, listChatsSchema);
  expect(list.data.chats.map((c) => c.title)).toEqual(['Blood for Rahim']);
});

test('PATCH/agent/chats/{chatId}: the title is trimmed, and 100 characters is allowed', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId });

  const trimmed = await renameChat(me.token, seeded._id, { title: '  padded  ' }, renameChatSchema);
  expect(trimmed.data.chat.title).toBe('padded');

  const longest = 'x'.repeat(100);
  const atLimit = await renameChat(me.token, seeded._id, { title: longest }, renameChatSchema);
  expect(atLimit.data.chat.title).toBe(longest);
});

test('PATCH/agent/chats/{chatId}: a rename does not move the chat up the list', async () => {
  // updatedAt is the last time the conversation itself moved. The list is ordered by it, and a
  // rename is not activity.
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const updatedAt = Date.now() - 60000;
  const seeded = await seedChat({ owner: me.donorId, updatedAt });

  const response = await renameChat(me.token, seeded._id, { title: 'renamed' }, renameChatSchema);
  expect(response.data.chat.updatedAt).toBe(updatedAt);
});

test('PATCH/agent/chats/{chatId}: invalid titles are refused with 400 and change nothing', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId, title: 'unchanged' });
  const as = asSignIn(me.token);
  const patch = (body) => () => operations.authedPatch(`/agent/chats/${seeded._id}`, body, as);

  await expectStatus(patch({}), 400);
  await expectStatus(patch({ title: '' }), 400);
  await expectStatus(patch({ title: '   ' }), 400);
  await expectStatus(patch({ title: 'x'.repeat(101) }), 400);
  await expectStatus(patch({ title: 42 }), 400);
  // Only the title may be changed through this route. An extra key is a 400, not ignored.
  await expectStatus(patch({ title: 'ok', userDeletedChat: true }), 400);

  const list = await listChats(me.token, listChatsSchema);
  expect(list.data.chats.map((c) => c.title)).toEqual(['unchanged']);
});
