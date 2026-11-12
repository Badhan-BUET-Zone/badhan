const operations = require('../../lib/operations');
const { toolCallRecordedSchema, getChatSchema, chatNotFoundSchema, stepRefusalSchema } = require('../schemas');
const {
  createVolunteer,
  createDemotedMemberHoldingToken,
  asSignIn,
  getChat,
  reportToolCall,
  seedChat,
  inspectChat,
  expectStatus,
} = require('../helpers');

// PUT /agent/chats/{chatId}/toolCalls/{toolCallId} — the browser's report of one API call it ran
// (or could not run, or the member declined). The backend stores the result for the card and works
// out the model's own copy of it. It never calls the model, so none of this needs a key.

const DISPLAY_LIMIT = 250000;
const MODEL_COPY_LIMIT = 60000;

const pendingRun = (name) => ({
  status: 'pending',
  name,
  label: 'Search for donors filtered by criteria',
  method: 'GET',
  path: '/search/v3?bloodGroup=4',
  args: { bloodGroup: 4 },
  body: null,
  isWrite: false,
  httpStatus: null,
  durationMs: null,
  response: null,
  note: null,
});

// A turn waiting on the browser: the model asked for three calls, none reported yet.
async function seedWaitingChat(owner, overrides = {}) {
  const ids = ['call_a', 'call_b', 'call_c'];
  return seedChat({
    owner,
    messages: [
      { role: 'user', content: 'Find O+ donors' },
      {
        role: 'assistant',
        content: '',
        toolCalls: ids.map((id) => ({ id, type: 'function', function: { name: 'SearchDonors', arguments: '{"bloodGroup":4}' } })),
      },
      ...ids.map((id) => ({ role: 'tool', toolCallId: id, content: '', run: pendingRun('SearchDonors') })),
    ],
    ...overrides,
  });
}

const put = (token, chatId, toolCallId, body) => () =>
  operations.authedPut(`/agent/chats/${chatId}/toolCalls/${toolCallId}`, body, asSignIn(token));

test('done: the result is stored for the card, and the model gets a compact copy', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedWaitingChat(me.donorId);
  const pretty = JSON.stringify({ status: 'OK', filteredDonors: [] }, null, 2);

  const response = await reportToolCall(
    me.token, chat._id, 'call_a',
    { status: 'done', httpStatus: 200, durationMs: 140, response: pretty },
    toolCallRecordedSchema
  );

  const { toolMessage } = response.data;
  expect(toolMessage.toolCallId).toBe('call_a');
  expect(toolMessage.run).toMatchObject({ status: 'done', httpStatus: 200, durationMs: 140, response: pretty, note: null });
  // What was there before the report is kept: the label and the request.
  expect(toolMessage.run.label).toBe('Search for donors filtered by criteria');
  expect(toolMessage.run.path).toBe('/search/v3?bloodGroup=4');
  // The model's copy: the body re-serialised without the card's indentation.
  expect(toolMessage.content).toBe('{"httpStatus":200,"body":{"status":"OK","filteredDonors":[]}}');

  // And it is what opening the chat shows.
  const opened = await getChat(me.token, chat._id, getChatSchema);
  expect(opened.data.messages.find((m) => m.toolCallId === 'call_a')).toEqual(toolMessage);
});

test('done with a body that is not JSON: the model gets it as a string', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedWaitingChat(me.donorId);

  const response = await reportToolCall(me.token, chat._id, 'call_a', { status: 'done', httpStatus: 502, response: 'Bad Gateway' });
  expect(response.data.toolMessage.content).toBe('{"httpStatus":502,"body":"Bad Gateway"}');
});

test('denied, failed and cancelled each tell the model what happened', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedWaitingChat(me.donorId);

  const denied = await reportToolCall(me.token, chat._id, 'call_a', { status: 'denied' }, toolCallRecordedSchema);
  expect(denied.data.toolMessage.run.status).toBe('denied');
  expect(denied.data.toolMessage.run.httpStatus).toBeNull();
  expect(JSON.parse(denied.data.toolMessage.content).error).toMatch(/declined/);

  const failed = await reportToolCall(
    me.token, chat._id, 'call_b',
    { status: 'failed', note: 'The request did not complete: the API is unreachable' },
    toolCallRecordedSchema
  );
  expect(failed.data.toolMessage.run.note).toBe('The request did not complete: the API is unreachable');
  expect(JSON.parse(failed.data.toolMessage.content)).toEqual({ error: 'The request did not complete: the API is unreachable' });

  const cancelled = await reportToolCall(me.token, chat._id, 'call_c', { status: 'cancelled' }, toolCallRecordedSchema);
  expect(JSON.parse(cancelled.data.toolMessage.content).error).toMatch(/Cancelled/);
});

test('a result can be reported once: the second report is a 409 and changes nothing', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedWaitingChat(me.donorId);

  await reportToolCall(me.token, chat._id, 'call_a', { status: 'done', httpStatus: 200, response: '{"first":true}' });
  const response = await expectStatus(put(me.token, chat._id, 'call_a', { status: 'denied' }), 409);
  operations.validateSchema(response.data, stepRefusalSchema(409, ['alreadyAnswered']));

  const opened = await getChat(me.token, chat._id);
  expect(opened.data.messages.find((m) => m.toolCallId === 'call_a').run.status).toBe('done');
});

test('a call that the chat already closed out cannot be reported either', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedChat({
    owner: me.donorId,
    messages: [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'call_x', type: 'function', function: { name: 'GetMe', arguments: '{}' } }] },
      { role: 'tool', toolCallId: 'call_x', content: '{"error":"No result was recorded"}', run: { ...pendingRun('GetMe'), status: 'cancelled' } },
    ],
  });

  const response = await expectStatus(put(me.token, chat._id, 'call_x', { status: 'done', httpStatus: 200, response: '{}' }), 409);
  expect(response.data.reason).toBe('alreadyAnswered');
});

test('a tool call id that is not in the chat is a 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const chat = await seedWaitingChat(me.donorId);

  const response = await expectStatus(put(me.token, chat._id, 'call_nowhere', { status: 'denied' }), 404);
  expect(response.data.message).toBe('Tool call not found');
});

test('the 404 rule: another member\'s chat, or one the member deleted, and the call stays pending', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const other = await createVolunteer(signInResponse);
  const theirs = await seedWaitingChat(other.donorId);
  const mineDeleted = await seedWaitingChat(me.donorId, { userDeletedChat: true, userDeletedAt: Date.now() });

  for (const chatId of [theirs._id, mineDeleted._id, 'not-an-id']) {
    // eslint-disable-next-line no-await-in-loop
    const response = await expectStatus(put(me.token, chatId, 'call_a', { status: 'denied' }), 404);
    operations.validateSchema(response.data, chatNotFoundSchema);
  }

  const stillTheirs = await getChat(other.token, theirs._id);
  expect(stillTheirs.data.messages.find((m) => m.toolCallId === 'call_a').run.status).toBe('pending');
});

test('a report moves the chat up the member\'s list', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await createVolunteer(signInResponse);
  const updatedAt = Date.now() - 60000;
  const chat = await seedWaitingChat(me.donorId, { updatedAt });

  await reportToolCall(me.token, chat._id, 'call_a', { status: 'denied' });
  expect((await inspectChat(chat._id)).chat.updatedAt).toBeGreaterThan(updatedAt);
});

describe('validation', () => {
  test('bad reports are 400s and change nothing', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const chat = await seedWaitingChat(me.donorId);

    const bad = [
      {},
      { status: 'pending' },
      { status: 'finished' },
      // A call that ran has an HTTP status.
      { status: 'done', response: '{}' },
      { status: 'done', httpStatus: 42, response: '{}' },
      { status: 'done', httpStatus: 200, durationMs: -1 },
      // The body is reported as the text the API sent, not as parsed JSON.
      { status: 'done', httpStatus: 200, response: { status: 'OK' } },
      { status: 'failed', note: 42 },
      { status: 'denied', label: 'renamed' },
    ];
    for (const body of bad) {
      // eslint-disable-next-line no-await-in-loop
      await expectStatus(put(me.token, chat._id, 'call_a', body), 400);
    }

    const opened = await getChat(me.token, chat._id);
    expect(opened.data.messages.find((m) => m.toolCallId === 'call_a').run.status).toBe('pending');
  });

  test('401 without a token and 403 for a demoted member', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const demoted = await createDemotedMemberHoldingToken(signInResponse);
    const chat = await seedWaitingChat(demoted.donorId);

    await expectStatus(() => operations.guestPut(`/agent/chats/${chat._id}/toolCalls/call_a`, { status: 'denied' }), 401);
    await expectStatus(put(demoted.token, chat._id, 'call_a', { status: 'denied' }), 403);
  });
});

describe('size', () => {
  test('a 250,000-character response is accepted and stored whole', async () => {
    // Over the 100 KB every other route allows, which is why this one path has its own parser.
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const chat = await seedWaitingChat(me.donorId);
    const response = 'x'.repeat(DISPLAY_LIMIT);

    const reported = await reportToolCall(me.token, chat._id, 'call_a', { status: 'done', httpStatus: 200, response });
    expect(reported.data.toolMessage.run.response).toBe(response);
  });

  test('a longer response is clipped for the card and, further, for the model, not refused', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const chat = await seedWaitingChat(me.donorId);
    const response = 'y'.repeat(300000);

    const reported = await reportToolCall(me.token, chat._id, 'call_a', { status: 'done', httpStatus: 200, response });
    const { run, content } = reported.data.toolMessage;

    expect(run.response.startsWith('y'.repeat(DISPLAY_LIMIT))).toBe(true);
    expect(run.response).toContain('[not shown: 50000 more characters]');
    expect(content.length).toBeLessThan(MODEL_COPY_LIMIT + 100);
    expect(content).toContain('[truncated by the app:');
  });

  test('a body over 1 MB is a 413, and the call stays pending', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const chat = await seedWaitingChat(me.donorId);

    const response = await expectStatus(
      put(me.token, chat._id, 'call_a', { status: 'done', httpStatus: 200, response: 'z'.repeat(1100000) }),
      413
    );
    expect(response.data.message).toBe('The request body is too large');

    const opened = await getChat(me.token, chat._id);
    expect(opened.data.messages.find((m) => m.toolCallId === 'call_a').run.status).toBe('pending');
  });

  test('every other route keeps the 100 KB limit, and says so with a 413', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const me = await createVolunteer(signInResponse);
    const chat = await seedChat({ owner: me.donorId });

    await expectStatus(
      () => operations.authedPatch(`/agent/chats/${chat._id}`, { title: 't'.repeat(150000) }, asSignIn(me.token)),
      413
    );
  });
});
