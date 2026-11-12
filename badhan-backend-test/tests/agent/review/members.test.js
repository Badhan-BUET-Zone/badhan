const operations = require('../../lib/operations');
const { reviewMembersSchema, reviewMemberChatsSchema } = require('../schemas');
const {
  createVolunteer,
  createHallAdmin,
  createSuperAdmin,
  reviewMembers,
  reviewMemberChats,
  seedChats,
  sampleMessages,
  expectStatus,
} = require('../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// The review page's first two columns: every member with chats, then one member's chats.

// A well-formed donor id that no donor has: a member whose record has since been deleted.
const GONE_DONOR_ID = '5e6b8b3f1c9d440000a1b2c4';

test('GET/agent/review/members: nobody yet is an empty list', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);

  const response = await reviewMembers(admin.token, reviewMembersSchema);
  expect(response.data.members).toEqual([]);
});

test('GET/agent/review/members: one row per member, counted, most recent activity first', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse, { name: 'Reviewing Admin' });
  const rahim = await createVolunteer(signInResponse, { name: 'Rahim', hall: HALLS_INDEX.SUHRAWARDY });
  const karim = await createHallAdmin(signInResponse, { name: 'Karim', hall: HALLS_INDEX.SUHRAWARDY });
  const now = Date.now();

  await seedChats([
    { owner: rahim.donorId, updatedAt: now - 5000 },
    { owner: rahim.donorId, updatedAt: now - 1000, userDeletedChat: true, userDeletedAt: now - 1000 },
    { owner: karim.donorId, updatedAt: now - 3000 },
    // A super admin's own chats are reviewed like anyone else's.
    { owner: admin.donorId, updatedAt: now - 9000 },
  ]);

  const response = await reviewMembers(admin.token, reviewMembersSchema);
  expect(response.data.members).toEqual([
    {
      donorId: rahim.donorId,
      member: { _id: rahim.donorId, name: 'Rahim', hall: HALLS_INDEX.SUHRAWARDY, designation: 1 },
      chatCount: 2,
      deletedChatCount: 1,
      // A deleted chat's activity still counts.
      lastActivity: now - 1000,
    },
    {
      donorId: karim.donorId,
      member: { _id: karim.donorId, name: 'Karim', hall: HALLS_INDEX.SUHRAWARDY, designation: 2 },
      chatCount: 1,
      deletedChatCount: 0,
      lastActivity: now - 3000,
    },
    {
      donorId: admin.donorId,
      member: { _id: admin.donorId, name: 'Reviewing Admin', hall: HALLS_INDEX.CHATRI, designation: 3 },
      chatCount: 1,
      deletedChatCount: 0,
      lastActivity: now - 9000,
    },
  ]);
});

test('GET/agent/review/members: a member whose only chats they deleted is still listed', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const now = Date.now();

  await seedChats([
    { owner: member.donorId, userDeletedChat: true, userDeletedAt: now },
    { owner: member.donorId, userDeletedChat: true, userDeletedAt: now },
  ]);

  const response = await reviewMembers(admin.token, reviewMembersSchema);
  expect(response.data.members).toHaveLength(1);
  expect(response.data.members[0]).toMatchObject({ donorId: member.donorId, chatCount: 2, deletedChatCount: 2 });
});

test('GET/agent/review/members: a member whose donor record is gone is listed with member null', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  await seedChats([{ owner: GONE_DONOR_ID, messages: sampleMessages() }]);

  const response = await reviewMembers(admin.token, reviewMembersSchema);
  expect(response.data.members).toEqual([
    expect.objectContaining({ donorId: GONE_DONOR_ID, member: null, chatCount: 1 }),
  ]);
});

test('GET/agent/review/members/{donorId}/chats: every chat, deleted ones flagged, newest first', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse, { name: 'Chat Owner' });
  const other = await createVolunteer(signInResponse);
  const now = Date.now();

  const [kept, deleted] = await seedChats([
    { owner: member.donorId, title: 'kept', updatedAt: now - 2000, promptTokens: 1200, completionTokens: 40, messages: sampleMessages() },
    { owner: member.donorId, title: 'deleted', updatedAt: now - 1000, userDeletedChat: true, userDeletedAt: now - 500 },
    { owner: other.donorId, title: 'someone else\'s' },
  ]);

  const response = await reviewMemberChats(admin.token, member.donorId, reviewMemberChatsSchema);
  expect(response.data.member).toEqual({ _id: member.donorId, name: 'Chat Owner', hall: HALLS_INDEX.CHATRI, designation: 1 });
  expect(response.data.chats.map((c) => c._id)).toEqual([deleted._id, kept._id]);

  const [deletedRow, keptRow] = response.data.chats;
  expect(deletedRow).toMatchObject({ title: 'deleted', userDeletedChat: true, userDeletedAt: now - 500, messageCount: 0 });
  expect(keptRow).toMatchObject({
    title: 'kept',
    owner: member.donorId,
    userDeletedChat: false,
    userDeletedAt: null,
    messageCount: sampleMessages().length,
    promptTokens: 1200,
    completionTokens: 40,
  });
});

test('GET/agent/review/members/{donorId}/chats: a deleted donor\'s chats, with member null', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  await seedChats([{ owner: GONE_DONOR_ID, title: 'orphaned' }]);

  const response = await reviewMemberChats(admin.token, GONE_DONOR_ID, reviewMemberChatsSchema);
  expect(response.data.member).toBeNull();
  expect(response.data.chats.map((c) => c.title)).toEqual(['orphaned']);
});

test('GET/agent/review/members/{donorId}/chats: no chats is an empty list; a malformed id is a 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);

  const response = await reviewMemberChats(admin.token, member.donorId, reviewMemberChatsSchema);
  expect(response.data.chats).toEqual([]);

  await expectStatus(() => reviewMemberChats(admin.token, 'not-an-id'), 400);
});

test('listing members and chats writes nothing to App Activity', async () => {
  // Only opening a transcript is recorded.
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  await seedChats([{ owner: member.donorId }]);

  await reviewMembers(admin.token);
  await reviewMemberChats(admin.token, member.donorId);

  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => String(l.operation).includes('AGENT'))).toHaveLength(0);
});
