const operations = require('../../lib/operations');
const {
  createVolunteer,
  createHallAdmin,
  createSuperAdmin,
  createDemotedMemberHoldingToken,
  asSignIn,
  seedChat,
  inspectChat,
  sampleMessages,
  expectStatus,
} = require('../helpers');

// The five review routes read, export and delete every member's chats. Super admins only: a volunteer or a
// hall admin is refused on every one of them, and refused before anything is read or deleted.

async function reviewRoutes(signInResponse) {
  const owner = await createVolunteer(signInResponse);
  const chat = await seedChat({ owner: owner.donorId, messages: sampleMessages() });
  return {
    chat,
    calls: [
      (as) => operations.authedGet('/agent/review/members', as),
      (as) => operations.authedGet(`/agent/review/members/${owner.donorId}/chats`, as),
      (as) => operations.authedGet(`/agent/review/chats/${chat._id}`, as),
      (as) => operations.authedGet(`/agent/review/chats/${chat._id}/export`, as),
      (as) => operations.authedDelete(`/agent/review/chats/${chat._id}`, as),
    ],
  };
}

test('volunteers and hall admins get 403 on all five, and the chat survives', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { chat, calls } = await reviewRoutes(signInResponse);
  const volunteer = await createVolunteer(signInResponse);
  const hallAdmin = await createHallAdmin(signInResponse);

  for (const member of [volunteer, hallAdmin]) {
    for (const call of calls) {
      // eslint-disable-next-line no-await-in-loop
      await expectStatus(() => call(asSignIn(member.token)), 403);
    }
  }

  const stored = await inspectChat(chat._id);
  expect(stored.chat).not.toBeNull();
  expect(stored.storedMessageCount).toBe(sampleMessages().length);
});

test('a demoted member is 403 and no token is 401, on all five', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { chat, calls } = await reviewRoutes(signInResponse);
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  for (const call of calls) {
    // eslint-disable-next-line no-await-in-loop
    await expectStatus(() => call(asSignIn(demoted.token)), 403);
  }

  await expectStatus(() => operations.guestGet('/agent/review/members'), 401);
  await expectStatus(() => operations.guestGet(`/agent/review/members/${demoted.donorId}/chats`), 401);
  await expectStatus(() => operations.guestGet(`/agent/review/chats/${chat._id}`), 401);
  await expectStatus(() => operations.guestGet(`/agent/review/chats/${chat._id}/export`), 401);
  await expectStatus(() => operations.guestDelete(`/agent/review/chats/${chat._id}`), 401);
});

test('a super admin may use all five', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { calls } = await reviewRoutes(signInResponse);
  const admin = await createSuperAdmin(signInResponse);

  for (const call of calls) {
    // eslint-disable-next-line no-await-in-loop
    const response = await call(asSignIn(admin.token));
    expect(response.status).toBe(200);
  }
});
