const operations = require('../../lib/operations');
const { listChatsSchema } = require('../schemas');
const {
  createVolunteer,
  createHallAdmin,
  createSuperAdmin,
  createDemotedMemberHoldingToken,
  asSignIn,
  listChats,
  seedChat,
  sampleMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// The member gate on the four routes that act on a member's own chats. Each chains
// handleAuthentication THEN handleAgentVolunteerCheck, so a missing token is a 401 and a token
// whose holder is no longer a member is a 403.

test('no token at all is 401 on all four member routes, never 403', async () => {
  await expectStatus(() => operations.guestGet('/agent/chats'), 401);
  await expectStatus(() => operations.guestGet(`/agent/chats/${UNKNOWN_CHAT_ID}`), 401);
  await expectStatus(() => operations.guestPatch(`/agent/chats/${UNKNOWN_CHAT_ID}`, { title: 'x' }), 401);
  await expectStatus(() => operations.guestDelete(`/agent/chats/${UNKNOWN_CHAT_ID}`), 401);
});

test('a demoted member still holding a valid token is refused on all four, even for their own chat', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);
  // Their own chat, written while they were a member: ownership does not survive the demotion,
  // because the gate runs before the chat is looked up.
  const chat = await seedChat({ owner: demoted.donorId, messages: sampleMessages() });
  const as = asSignIn(demoted.token);

  await expectStatus(() => operations.authedGet('/agent/chats', as), 403);
  await expectStatus(() => operations.authedGet(`/agent/chats/${chat._id}`, as), 403);
  await expectStatus(() => operations.authedPatch(`/agent/chats/${chat._id}`, { title: 'mine' }, as), 403);
  await expectStatus(() => operations.authedDelete(`/agent/chats/${chat._id}`, as), 403);
});

test('the refusal names Badhan Agent, not the member chat', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  const response = await expectStatus(() => operations.authedGet('/agent/chats', asSignIn(demoted.token)), 403);
  expect(response.data.message).toBe('Only Badhan members can use Badhan Agent');
});

test('membership is checked before the body: a demoted member with a bad title gets 403, not 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  await expectStatus(
    () => operations.authedPatch(`/agent/chats/${UNKNOWN_CHAT_ID}`, { title: '' }, asSignIn(demoted.token)),
    403
  );
});

test('every rank from Volunteer upwards may use the member routes', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const volunteer = await createVolunteer(signInResponse);
  const hallAdmin = await createHallAdmin(signInResponse);
  const superAdmin = await createSuperAdmin(signInResponse);

  for (const member of [volunteer, hallAdmin, superAdmin]) {
    // eslint-disable-next-line no-await-in-loop
    const response = await listChats(member.token, listChatsSchema);
    expect(response.status).toBe(200);
    expect(response.data.chats).toEqual([]);
  }
});
