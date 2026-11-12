const operations = require('../../lib/operations');
const { stepRefusalSchema, notConfiguredSchema, chatNotFoundSchema, listChatsSchema } = require('../schemas');
const {
  createVolunteer,
  createDemotedMemberHoldingToken,
  asSignIn,
  listChats,
  getChat,
  seedChat,
  inspectChat,
  sampleMessages,
  assertAgentNotConfigured,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// The three step routes, on a server with no OpenAI key.
//
// No test here may reach a model call: there is no key, and a test run must not spend money. What
// they CAN reach is everything before it, because the order of a step is fixed — find the chat
// (404), the continue-only checks (409), the lock (409), and only then the key (503) — and nothing
// is saved before the key check passes.

beforeAll(assertAgentNotConfigured);

const startChat = (token, body) => () => operations.authedPost('/agent/chats', body, asSignIn(token));
const sendMessage = (token, chatId, body) => () =>
  operations.authedPost(`/agent/chats/${chatId}/messages`, body, asSignIn(token));
const continueChat = (token, chatId, body = {}) => () =>
  operations.authedPost(`/agent/chats/${chatId}/continue`, body, asSignIn(token));

// A user message, then `calls` model calls that each asked for one tool and got its result: the
// chat a member is in after `calls` steps of one turn. Ends on a tool result, so there is always
// something to continue.
function turnWithModelCalls(calls) {
  const messages = [{ role: 'user', content: 'Keep looking things up' }];
  for (let i = 0; i < calls; i += 1) {
    const id = `call_${i}`;
    messages.push({
      role: 'assistant',
      content: '',
      toolCalls: [{ id, type: 'function', function: { name: 'SearchDonors', arguments: '{}' } }],
    });
    messages.push({
      role: 'tool',
      toolCallId: id,
      content: '{"httpStatus":200,"body":{}}',
      run: { status: 'done', name: 'SearchDonors', label: 'Search for donors filtered by criteria', httpStatus: 200 },
    });
  }
  return messages;
}

// What a step would have changed: the chat's counters and lock, and how many messages it has.
async function snapshot(chatId) {
  const { chat, storedMessageCount } = await inspectChat(chatId);
  return {
    messageCount: chat.messageCount,
    storedMessageCount,
    updatedAt: chat.updatedAt,
    stepStartedAt: chat.stepStartedAt,
    promptTokens: chat.promptTokens,
  };
}

describe('503: the key check, and nothing saved', () => {
  test('POST/agent/chats: 503, and no chat is created', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);

    const response = await expectStatus(startChat(me.token, { content: 'Hello' }), 503);
    operations.validateSchema(response.data, notConfiguredSchema);

    const list = await listChats(me.token, listChatsSchema);
    expect(list.data.chats).toEqual([]);
    // The chat is created only after the key check, so there is nothing to log either.
    const logs = await operations.getLogs(signInResponse);
    expect(logs.data.logs.filter((l) => l.operation === 'POST AGENT CHAT')).toHaveLength(0);
  });

  test('POST/agent/chats/{chatId}/messages: 503, nothing saved, and the lock handed back', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const seeded = await seedChat({ owner: me.donorId, messages: sampleMessages() });
    const before = await snapshot(seeded._id);

    const response = await expectStatus(sendMessage(me.token, seeded._id, { content: 'And B+?' }), 503);
    operations.validateSchema(response.data, notConfiguredSchema);

    expect(await snapshot(seeded._id)).toEqual(before);
    expect(before.stepStartedAt).toBeNull();
  });

  test('POST/agent/chats/{chatId}/continue: 503, and a pending call is NOT closed out', async () => {
    // Closing out unanswered calls is step 5, after the key check. A refused step changes nothing.
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const seeded = await seedChat({
      owner: me.donorId,
      messages: [
        { role: 'user', content: 'Find O+ donors' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'call_p', type: 'function', function: { name: 'SearchDonors', arguments: '{}' } }],
        },
        { role: 'tool', toolCallId: 'call_p', content: '', run: { status: 'pending', name: 'SearchDonors' } },
      ],
    });

    await expectStatus(continueChat(me.token, seeded._id), 503);

    const chat = await getChat(me.token, seeded._id);
    expect(chat.data.messages[2].run.status).toBe('pending');
    expect((await snapshot(seeded._id)).stepStartedAt).toBeNull();
  });

  test('content at exactly 20,000 characters passes validation and reaches the key check', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);

    await expectStatus(startChat(me.token, { content: 'x'.repeat(20000) }), 503);
  });
});

describe('409: the checks that come before the key', () => {
  test('continue on a finished answer: nothing to continue', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const finished = await seedChat({ owner: me.donorId, messages: sampleMessages() });
    const before = await snapshot(finished._id);

    const response = await expectStatus(continueChat(me.token, finished._id), 409);
    operations.validateSchema(response.data, stepRefusalSchema(409, ['nothingToContinue']));
    expect(await snapshot(finished._id)).toEqual(before);
  });

  test('continue on a chat with no messages at all: nothing to continue', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const empty = await seedChat({ owner: me.donorId });

    const response = await expectStatus(continueChat(me.token, empty._id), 409);
    expect(response.data.reason).toBe('nothingToContinue');
  });

  test('continue after 20 model calls since the last user message: the limit', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const atLimit = await seedChat({ owner: me.donorId, messages: turnWithModelCalls(20) });

    const response = await expectStatus(continueChat(me.token, atLimit._id), 409);
    operations.validateSchema(response.data, stepRefusalSchema(409, ['limit']));
    expect(response.data.message).toBe('Stopped after 20 model calls for one message. Send a message to carry on.');
  });

  test('continue after 19 model calls is still allowed (and so reaches the key check)', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const belowLimit = await seedChat({ owner: me.donorId, messages: turnWithModelCalls(19) });

    await expectStatus(continueChat(me.token, belowLimit._id), 503);
  });

  test('the limit counts only since the LAST user message', async () => {
    // Twenty calls in an earlier turn, then a new message and two calls: the count is two.
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const earlier = turnWithModelCalls(20);
    const later = turnWithModelCalls(2).map((m) =>
      m.toolCallId ? { ...m, toolCallId: `later_${m.toolCallId}` } : m.toolCalls
        ? { ...m, toolCalls: m.toolCalls.map((c) => ({ ...c, id: `later_${c.id}` })) }
        : m
    );
    const chat = await seedChat({ owner: me.donorId, messages: [...earlier, ...later] });

    await expectStatus(continueChat(me.token, chat._id), 503);
  });

  test('a new message on that same 20-call chat answers 503, not 409: it starts the count again', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const atLimit = await seedChat({ owner: me.donorId, messages: turnWithModelCalls(20) });

    await expectStatus(sendMessage(me.token, atLimit._id, { content: 'Carry on' }), 503);
  });

  test('a held lock: both routes answer busy, and the lock is left alone', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const lockedAt = Date.now() - 1000;
    const busy = await seedChat({
      owner: me.donorId,
      stepStartedAt: lockedAt,
      messages: [{ role: 'user', content: 'Working on it' }],
    });

    const viaContinue = await expectStatus(continueChat(me.token, busy._id), 409);
    operations.validateSchema(viaContinue.data, stepRefusalSchema(409, ['busy']));
    expect(viaContinue.data.message).toBe('This chat is busy in another tab or window.');

    const viaMessage = await expectStatus(sendMessage(me.token, busy._id, { content: 'Hello?' }), 409);
    expect(viaMessage.data.reason).toBe('busy');

    expect((await snapshot(busy._id)).stepStartedAt).toBe(lockedAt);
  });

  test('a lock more than three minutes old does not block: the request reaches the key check', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const stale = await seedChat({
      owner: me.donorId,
      stepStartedAt: Date.now() - 4 * 60 * 1000,
      messages: [{ role: 'user', content: 'Left behind' }],
    });

    await expectStatus(sendMessage(me.token, stale._id, { content: 'Back again' }), 503);
    // Taken over, then handed back: the chat is free.
    expect((await snapshot(stale._id)).stepStartedAt).toBeNull();
  });
});

describe('404 and 400 come first', () => {
  test('the 404 rule holds on both step routes that take a chat', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const other = await createVolunteer(signInResponse);
    // Someone else's chat that is locked AND at the limit: 404 still comes first.
    const theirs = await seedChat({ owner: other.donorId, stepStartedAt: Date.now(), messages: turnWithModelCalls(20) });
    const mineDeleted = await seedChat({
      owner: me.donorId,
      userDeletedChat: true,
      userDeletedAt: Date.now(),
      messages: [{ role: 'user', content: 'gone' }],
    });

    for (const chatId of [theirs._id, mineDeleted._id, UNKNOWN_CHAT_ID, 'not-an-id']) {
      // eslint-disable-next-line no-await-in-loop
      const viaMessage = await expectStatus(sendMessage(me.token, chatId, { content: 'hi' }), 404);
      operations.validateSchema(viaMessage.data, chatNotFoundSchema);
      // eslint-disable-next-line no-await-in-loop
      const viaContinue = await expectStatus(continueChat(me.token, chatId), 404);
      operations.validateSchema(viaContinue.data, chatNotFoundSchema);
    }
  });

  test('content is validated: missing, empty, blank, too long, not a string, or with extra keys', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const seeded = await seedChat({ owner: me.donorId, messages: sampleMessages() });

    const bad = [{}, { content: '' }, { content: '   ' }, { content: 'x'.repeat(20001) }, { content: 42 }, { content: 'hi', model: 'other' }];
    for (const body of bad) {
      // eslint-disable-next-line no-await-in-loop
      await expectStatus(startChat(me.token, body), 400);
      // eslint-disable-next-line no-await-in-loop
      await expectStatus(sendMessage(me.token, seeded._id, body), 400);
    }
  });

  test('continue takes no body', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const seeded = await seedChat({ owner: me.donorId, messages: [{ role: 'user', content: 'hi' }] });

    await expectStatus(continueChat(me.token, seeded._id, { content: 'sneaked in' }), 400);
  });

  test('401 without a token and 403 for a demoted member, on all three', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const demoted = await createDemotedMemberHoldingToken(signInResponse);
    const theirs = await seedChat({ owner: demoted.donorId, messages: [{ role: 'user', content: 'hi' }] });

    await expectStatus(() => operations.guestPost('/agent/chats', { content: 'hi' }), 401);
    await expectStatus(() => operations.guestPost(`/agent/chats/${theirs._id}/messages`, { content: 'hi' }), 401);
    await expectStatus(() => operations.guestPost(`/agent/chats/${theirs._id}/continue`, {}), 401);

    await expectStatus(startChat(demoted.token, { content: 'hi' }), 403);
    await expectStatus(sendMessage(demoted.token, theirs._id, { content: 'hi' }), 403);
    await expectStatus(continueChat(demoted.token, theirs._id), 403);
  });
});
