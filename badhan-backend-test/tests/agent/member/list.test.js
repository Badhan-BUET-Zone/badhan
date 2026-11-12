const operations = require('../../lib/operations');
const { listChatsSchema } = require('../schemas');
const { createVolunteer, createSuperAdmin, listChats, seedChats } = require('../helpers');

// GET /agent/chats — the caller's own chats that they have not deleted, newest first.

test('GET/agent/chats: only the caller\'s own chats, and none they deleted', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const someoneElse = await createVolunteer(signInResponse);
  const now = Date.now();

  await seedChats([
    { owner: me.donorId, title: 'mine', updatedAt: now },
    { owner: me.donorId, title: 'mine, deleted', userDeletedChat: true, userDeletedAt: now, updatedAt: now },
    { owner: someoneElse.donorId, title: 'theirs', updatedAt: now },
  ]);

  const response = await listChats(me.token, listChatsSchema);
  expect(response.data.chats.map((c) => c.title)).toEqual(['mine']);
});

test('GET/agent/chats: newest updatedAt first, whatever order they were created in', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const now = Date.now();

  await seedChats([
    { owner: me.donorId, title: 'middle', createdAt: now - 3000, updatedAt: now - 2000 },
    { owner: me.donorId, title: 'newest', createdAt: now - 5000, updatedAt: now - 1000 },
    { owner: me.donorId, title: 'oldest', createdAt: now - 1000, updatedAt: now - 3000 },
  ]);

  const response = await listChats(me.token, listChatsSchema);
  expect(response.data.chats.map((c) => c.title)).toEqual(['newest', 'middle', 'oldest']);
  expect(response.data.chats[0].updatedAt).toBe(now - 1000);
  expect(response.data.chats[0].createdAt).toBe(now - 5000);
});

test('GET/agent/chats: a super admin sees only their own chats here too', async () => {
  // Every member's chats are visible to a super admin only through the review routes. Their own
  // Badhan Agent page works exactly like everyone else's.
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const volunteer = await createVolunteer(signInResponse);

  await seedChats([
    { owner: admin.donorId, title: 'the admin\'s' },
    { owner: volunteer.donorId, title: 'the volunteer\'s' },
  ]);

  const response = await listChats(admin.token, listChatsSchema);
  expect(response.data.chats.map((c) => c.title)).toEqual(['the admin\'s']);
});
