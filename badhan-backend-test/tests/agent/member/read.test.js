const operations = require('../../lib/operations');
const { getChatSchema, chatNotFoundSchema } = require('../schemas');
const {
  createVolunteer,
  createSuperAdmin,
  asSignIn,
  getChat,
  seedChat,
  sampleMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// GET /agent/chats/{chatId}, and THE 404 RULE that all three single-chat routes share: someone
// else's chat, a chat the caller deleted, an id that does not exist and an id that is not an id
// all answer the same 404 with the same body, so trying ids teaches a caller nothing.

test('GET/agent/chats/{chatId}: the chat and all its messages, in order', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId, title: 'O+ in Ahsanullah', messages: sampleMessages() });

  const response = await getChat(me.token, seeded._id, getChatSchema);

  expect(response.data.chat._id).toBe(seeded._id);
  expect(response.data.chat.title).toBe('O+ in Ahsanullah');
  expect(response.data.messages.map((m) => m.seq)).toEqual([0, 1, 2, 3]);
  expect(response.data.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);

  // What each role carries comes back as it was stored.
  const [, askedForTools, toolResult, answer] = response.data.messages;
  expect(askedForTools.toolCalls[0].id).toBe('call_1');
  expect(askedForTools.usage).toEqual({ prompt_tokens: 1200, completion_tokens: 40 });
  expect(toolResult.toolCallId).toBe('call_1');
  expect(toolResult.run.label).toBe('Search for donors filtered by criteria');
  expect(toolResult.run.args).toEqual({ bloodGroup: 4, hall: 0 });
  expect(answer.openaiModel).toBe('gpt-6-luna');

  // Role-specific fields are absent on the other roles, not null and not empty.
  const [question] = response.data.messages;
  expect(question).not.toHaveProperty('toolCalls');
  expect(question).not.toHaveProperty('run');
});

test('GET/agent/chats/{chatId}: a chat with no messages yet is an empty list, not an error', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: me.donorId });

  const response = await getChat(me.token, seeded._id, getChatSchema);
  expect(response.data.messages).toEqual([]);
});

describe('the 404 rule', () => {
  // Each case is run against all three single-chat routes.
  const routes = [
    ['GET', (as, id) => operations.authedGet(`/agent/chats/${id}`, as)],
    ['PATCH', (as, id) => operations.authedPatch(`/agent/chats/${id}`, { title: 'renamed' }, as)],
    ['DELETE', (as, id) => operations.authedDelete(`/agent/chats/${id}`, as)],
  ];

  async function expectChatNotFoundEverywhere(token, chatId) {
    for (const [, call] of routes) {
      // eslint-disable-next-line no-await-in-loop
      const response = await expectStatus(() => call(asSignIn(token), chatId), 404);
      operations.validateSchema(response.data, chatNotFoundSchema);
    }
  }

  test('another member\'s chat', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const owner = await createVolunteer(signInResponse);
    const theirs = await seedChat({ owner: owner.donorId, title: 'not mine', messages: sampleMessages() });

    await expectChatNotFoundEverywhere(me.token, theirs._id);
  });

  test('another member\'s chat, even for a super admin on the member routes', async () => {
    // A super admin reads other members' chats through the review routes only.
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const owner = await createVolunteer(signInResponse);
    const theirs = await seedChat({ owner: owner.donorId, messages: sampleMessages() });

    await expectChatNotFoundEverywhere(admin.token, theirs._id);
  });

  test('the caller\'s own chat that they deleted', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const deleted = await seedChat({
      owner: me.donorId,
      userDeletedChat: true,
      userDeletedAt: Date.now(),
      messages: sampleMessages(),
    });

    await expectChatNotFoundEverywhere(me.token, deleted._id);
  });

  test('a well-formed id that no chat has', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);

    await expectChatNotFoundEverywhere(me.token, UNKNOWN_CHAT_ID);
  });

  test('an id that is not an id at all: 404, never 400 or 500', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);

    for (const malformed of ['abc', '123', 'not-a-chat-id-at-all-0000']) {
      // eslint-disable-next-line no-await-in-loop
      await expectChatNotFoundEverywhere(me.token, malformed);
    }
  });
});
