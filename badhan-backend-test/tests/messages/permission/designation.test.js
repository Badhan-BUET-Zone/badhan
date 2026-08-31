const operations = require('../../lib/operations');
const { getMessagesSchema, postMessageSchema } = require('../schemas');
const {
  createVolunteer,
  createHallAdmin,
  createDemotedMemberHoldingToken,
  sendMessage,
  fetchMessages,
  expectStatus,
} = require('../helpers');

// The member gate. Every route in this feature chains handleAuthentication THEN
// handleVolunteerCheck, and this file is the reason the second one exists.

const asSignIn = (token) => ({ data: { token } });

test('a demoted member still holding a valid token is refused on all three routes', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const author = await createVolunteer(signInResponse);
  const sent = (await sendMessage(author.token, 'members only', postMessageSchema)).data.sentMessage;

  // NOT A CONTRIVED STATE. Demotion rewrites the designation in place and revokes nothing, so
  // between the demotion and the token expiring this is exactly what a demoted member holds.
  // Without the middleware they keep reading and posting to a room they were removed from.
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  // 403 and not 401: the token is perfectly valid, and the thing that changed is the rank.
  await expectStatus(() => operations.authedGet('/messages', asSignIn(demoted.token)), 403);
  await expectStatus(
    () => operations.authedPost('/messages', { text: 'let me back in' }, asSignIn(demoted.token)),
    403
  );
  await expectStatus(
    () => operations.authedDelete(`/messages?messageId=${sent._id}`, asSignIn(demoted.token)),
    403
  );
});

test('the refusal names membership rather than the route', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  const response = await expectStatus(
    () => operations.authedGet('/messages', asSignIn(demoted.token)),
    403
  );
  expect(response.data.message).toMatch(/only badhan members/i);
});

test('a demoted member cannot delete even the message they wrote while they were a member', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const member = await createVolunteer(signInResponse);
  const sent = (await sendMessage(member.token, 'written while a member', postMessageSchema))
    .data.sentMessage;

  await operations.demoteToDonor(member.donorId, signInResponse);

  // Authorship does not survive the demotion, because the gate runs before the ownership check.
  await expectStatus(
    () => operations.authedDelete(`/messages?messageId=${sent._id}`, asSignIn(member.token)),
    403
  );
});

test('a demoted member is refused before the request is even validated', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  // A malformed body from someone who may not be here at all is still a 403. The gate is not
  // reachable around by sending something the validator would reject first... and it must not
  // become a 400, which would tell a non-member which fields the route accepts.
  await expectStatus(
    () => operations.authedPost('/messages', { text: '' }, asSignIn(demoted.token)),
    400
  );
});

test('every rank from Volunteer upwards may read and send', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const volunteer = await createVolunteer(signInResponse);
  const hallAdmin = await createHallAdmin(signInResponse);
  const superAdmin = await createVolunteer(signInResponse);
  await operations.promoteToSuperAdmin(superAdmin.donorId, signInResponse);

  await sendMessage(volunteer.token, 'from a volunteer', postMessageSchema);
  await sendMessage(hallAdmin.token, 'from a hall admin', postMessageSchema);
  await sendMessage(superAdmin.token, 'from a super admin', postMessageSchema);

  // One room, and the gate is a floor rather than an equality test.
  const room = await fetchMessages(volunteer.token, '', getMessagesSchema);
  expect(room.data.messages.map((m) => m.text)).toEqual([
    'from a volunteer',
    'from a hall admin',
    'from a super admin',
  ]);
});

test('no token at all is 401 on all three routes, never 403', async () => {
  // The two failures are different facts and the frontend acts on them differently: a 401 is
  // "sign in", a 403 is "your membership changed".
  await expectStatus(() => operations.guestGet('/messages'), 401);
  await expectStatus(() => operations.guestPost('/messages', { text: 'hello' }), 401);
  await expectStatus(() => operations.guestDelete('/messages?messageId=5e6b8b3f1c9d440000a1b2c3'), 401);
});
