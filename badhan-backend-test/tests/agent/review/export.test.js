const operations = require('../../lib/operations');
const { exportSchema, chatNotFoundSchema } = require('../schemas');
const {
  createVolunteer,
  createSuperAdmin,
  exportChat,
  seedChat,
  inspectChat,
  sampleMessages,
  PART_KEYS,
  recordedParts,
  recordedMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
} = require('../helpers');

// GET /agent/review/chats/{chatId}/export — one chat exactly as stored, for the download button.

test('the chat is exactly the stored document, step lock included', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse, { name: 'Export Owner' });
  const lockedAt = Date.now() - 5000;
  const seeded = await seedChat({
    owner: member.donorId,
    title: 'O+ in Ahsanullah',
    promptTokens: 1200,
    completionTokens: 40,
    stepStartedAt: lockedAt,
    messages: sampleMessages(),
  });

  const before = Date.now();
  const response = await exportChat(admin.token, seeded._id, exportSchema);

  const stored = await inspectChat(seeded._id);
  expect(response.data.chat).toEqual(stored.chat);
  expect(response.data.chat.stepStartedAt).toBe(lockedAt);
  expect(response.data.member.name).toBe('Export Owner');
  expect(response.data.exportedAt).toBeGreaterThanOrEqual(before);
});

test('every message in order, with its chatId and every field it was stored with', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

  const response = await exportChat(admin.token, seeded._id, exportSchema);

  const { messages } = response.data;
  expect(messages.map((m) => m._id)).toEqual(seeded.messages.map((m) => m._id));
  expect(messages.map((m) => m.seq)).toEqual([0, 1, 2, 3]);
  sampleMessages().forEach((sent, i) => {
    expect(messages[i]).toMatchObject({ ...sent, chatId: seeded._id });
  });
});

test('a chat the member deleted, and one whose owner is gone, can be exported', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);
  const member = await createVolunteer(signInResponse);
  const deletedAt = Date.now() - 1000;
  const deleted = await seedChat({ owner: member.donorId, userDeletedChat: true, userDeletedAt: deletedAt });
  const orphan = await seedChat({ owner: '5e6b8b3f1c9d440000a1b2c4' });

  const deletedResponse = await exportChat(admin.token, deleted._id, exportSchema);
  expect(deletedResponse.data.chat).toMatchObject({ userDeletedChat: true, userDeletedAt: deletedAt });
  expect(deletedResponse.data.messages).toEqual([]);

  const orphanResponse = await exportChat(admin.token, orphan._id, exportSchema);
  expect(orphanResponse.data.member).toBeNull();
});

test('an unknown or malformed chat id is a 404, and writes no App Activity row', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse);

  for (const chatId of [UNKNOWN_CHAT_ID, 'not-an-id']) {
    // eslint-disable-next-line no-await-in-loop
    const response = await expectStatus(() => exportChat(admin.token, chatId), 404);
    operations.validateSchema(response.data, chatNotFoundSchema);
  }

  const logs = await operations.getLogs(signInResponse);
  expect(logs.data.logs.filter((l) => l.operation === 'EXPORT AGENT CHAT (REVIEW)')).toHaveLength(0);
});

test('an export is recorded in App Activity, under the super admin who took it', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse, { name: 'Debugging Admin' });
  const member = await createVolunteer(signInResponse);
  const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

  await exportChat(admin.token, seeded._id);

  const logs = await operations.getLogs(signInResponse);
  const entries = logs.data.logs.filter((l) => l.operation === 'EXPORT AGENT CHAT (REVIEW)');
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe('Debugging Admin');
  // Exporting is not also logged as opening the chat.
  expect(logs.data.logs.filter((l) => l.operation === 'GET AGENT CHAT (REVIEW)')).toHaveLength(0);
});

describe('recorded model calls', () => {
  const seedRecorded = async (signInResponse) => {
    const member = await createVolunteer(signInResponse);
    return seedChat({ owner: member.donorId, requestParts: recordedParts(), messages: recordedMessages() });
  };

  test('the parts, the failed call and every call record are in the stored documents', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const seeded = await seedRecorded(signInResponse);

    const response = await exportChat(admin.token, seeded._id, exportSchema);

    expect(response.data.chat.requestParts).toEqual(recordedParts());
    expect(response.data.messages.map((m) => m.role)).toEqual(['user', 'error', 'assistant', 'tool', 'assistant']);
    recordedMessages().forEach((sent, i) => {
      expect(response.data.messages[i]).toMatchObject(sent);
    });
  });

  test('the conversation as OpenAI is sent it: the failed call is not in it', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const seeded = await seedRecorded(signInResponse);

    const { data } = await exportChat(admin.token, seeded._id, exportSchema);

    const [question, , askedForTools, toolResult, answer] = recordedMessages();
    expect(data.conversation).toEqual([
      { role: 'user', content: question.content },
      { role: 'assistant', content: null, tool_calls: askedForTools.toolCalls },
      { role: 'tool', tool_call_id: 'call_1', content: toolResult.content },
      { role: 'assistant', content: answer.content },
    ]);
  });

  test('each call: the request it sent, rebuilt from the parts, and what came back', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const seeded = await seedRecorded(signInResponse);

    const { data } = await exportChat(admin.token, seeded._id, exportSchema);

    const parts = recordedParts();
    const [, failed, askedForTools, , answer] = recordedMessages();
    const request = { model: 'gpt-6-luna', messages: null, tools: parts[PART_KEYS.tools], reasoning_effort: 'none' };
    const system = (note) => ({ role: 'system', content: `${parts[PART_KEYS.systemPrompt]}\n\n${note}` });
    expect(data.modelCalls).toEqual([
      {
        seq: 1,
        outcome: 'failed',
        requestId: 'req_1',
        durationMs: 30000,
        request,
        systemMessage: system('## Session\n- Call 1'),
        conversationLength: 1,
        messages: null,
        response: null,
        error: failed.modelCall.error,
      },
      {
        seq: 2,
        outcome: 'answered',
        requestId: 'req_2',
        durationMs: 1500,
        request,
        // The retry was sent the same history: the failed call is not part of it.
        systemMessage: system('## Session\n- Call 2'),
        conversationLength: 1,
        messages: null,
        // OpenAI's answer whole again: model, usage and tool calls put back from the message.
        response: {
          ...askedForTools.modelCall.response,
          model: 'gpt-6-luna-2026-01-01',
          usage: askedForTools.usage,
          choices: [{
            ...askedForTools.modelCall.response.choices[0],
            message: { ...askedForTools.modelCall.response.choices[0].message, tool_calls: askedForTools.toolCalls },
          }],
        },
        error: null,
      },
      {
        seq: 4,
        outcome: 'answered',
        requestId: 'req_3',
        durationMs: 900,
        request,
        systemMessage: system('## Session\n- Call 3'),
        conversationLength: 3,
        messages: null,
        response: {
          ...answer.modelCall.response,
          model: 'gpt-6-luna-2026-01-01',
          usage: answer.usage,
          choices: [{
            ...answer.modelCall.response.choices[0],
            message: { ...answer.modelCall.response.choices[0].message, content: answer.content },
          }],
        },
        error: null,
      },
    ]);
  });

  test('a part the chat does not hold is reported, not guessed', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const member = await createVolunteer(signInResponse);
    const { [PART_KEYS.tools]: dropped, ...withoutTools } = recordedParts();
    const seeded = await seedChat({ owner: member.donorId, requestParts: withoutTools, messages: recordedMessages() });

    const { data } = await exportChat(admin.token, seeded._id, exportSchema);

    expect(dropped).toBeDefined();
    expect(data.modelCalls).toHaveLength(3);
    for (const call of data.modelCalls) {
      expect(call.request).toBeNull();
      expect(call.missingParts).toEqual([PART_KEYS.tools]);
    }
  });

  test('a chat from before calls were recorded has none, and no conversation', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const admin = await createSuperAdmin(signInResponse);
    const member = await createVolunteer(signInResponse);
    const seeded = await seedChat({ owner: member.donorId, messages: sampleMessages() });

    const { data } = await exportChat(admin.token, seeded._id, exportSchema);

    expect(data.modelCalls).toEqual([]);
    expect(data.conversation).toEqual([]);
  });
});
