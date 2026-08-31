const operations = require('../../lib/operations');
const { postMessageSchema, getMessagesSchema } = require('../schemas');
const { createVolunteer, sendMessage, fetchMessages, expectStatus } = require('../helpers');

// POST /messages — the body is `{ text }` and nothing else.

const asSignIn = (token) => ({ data: { token } });

const expectRejected = (token, body, status = 400) =>
  expectStatus(() => operations.authedPost('/messages', body, asSignIn(token)), status);

test('POST/messages: requires a session', async () => {
  await expectStatus(() => operations.guestPost('/messages', { text: 'anonymous' }), 401);
});

test('POST/messages: returns 201 and the created message, already joined', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorInfo } = await createVolunteer(signInResponse);

  const response = await sendMessage(token, 'hello room', postMessageSchema);

  expect(response.status).toBe(201);
  const sent = response.data.sentMessage;
  expect(sent.text).toBe('hello room');
  expect(typeof sent.date).toBe('number');
  // Joined, so the sender renders their own bubble with no second round trip.
  expect(sent.sender.name).toBe(donorInfo.name);
  expect(sent.sender.studentId).toBe(donorInfo.studentId);
});

test('POST/messages: the echo is the same element shape GET returns', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const sent = (await sendMessage(token, 'shape check', postMessageSchema)).data.sentMessage;
  const fetched = (await fetchMessages(token, '', getMessagesSchema)).data.messages[0];

  // Not merely similar — identical. The echo is produced by the same pipeline the read uses,
  // and that is what stops a sent bubble and a fetched one from ever drifting apart.
  expect(sent).toEqual(fetched);
});

test('POST/messages: the echo leaks no credential or contact field', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const response = await sendMessage(token, 'no leaks on the way out', postMessageSchema);
  expect(JSON.stringify(response.data)).not.toMatch(/password|email|address/i);
  expect(response.data.sentMessage.sender.phone).toBeUndefined();
});

test('POST/messages: text is trimmed before it is stored', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const response = await sendMessage(token, '   padded on both sides   ', postMessageSchema);
  expect(response.data.sentMessage.text).toBe('padded on both sides');
});

test('POST/messages: an empty or whitespace-only body is refused', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  await expectRejected(token, { text: '' });
  // Whitespace only. Trimming happens before the length check, so this is a 1-character
  // minimum failure rather than a stored blank row.
  await expectRejected(token, { text: '     ' });
  await expectRejected(token, {});
});

test('POST/messages: the length bounds are 1 and 2000, inclusive', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const single = await sendMessage(token, 'x', postMessageSchema);
  expect(single.data.sentMessage.text).toBe('x');

  const atLimit = await sendMessage(token, 'y'.repeat(2000), postMessageSchema);
  expect(atLimit.data.sentMessage.text.length).toBe(2000);

  const overLimit = await expectRejected(token, { text: 'z'.repeat(2001) });
  expect(overLimit.data.message).toMatch(/between 1 and 2000/i);
});

test('POST/messages: a body that states senderId or date is refused, not silently ignored', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorId } = await createVolunteer(signInResponse);
  const victim = await createVolunteer(signInResponse);

  // Silently ignoring these is how a client comes to believe it can post as somebody else, or
  // backdate a message past a reader's scroll position.
  const spoofedSender = await expectRejected(token, { text: 'not from me', senderId: victim.donorId });
  expect(spoofedSender.data.message).toMatch(/unexpected keys: senderId/i);

  const backdated = await expectRejected(token, { text: 'from the past', date: 1700000000000 });
  expect(backdated.data.message).toMatch(/unexpected keys: date/i);

  // And nothing was written on either attempt.
  const room = await fetchMessages(token, '', getMessagesSchema);
  expect(room.data.messages).toEqual([]);
  expect(donorId).toBeDefined();
});

test('POST/messages: text is stored RAW, not html-escaped', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // Escaping would turn this into "I can&#x27;t come" on every member's screen. Safety is
  // enforced at render time instead — the frontend uses text interpolation only, never v-html.
  const apostrophe = await sendMessage(token, "I can't come tonight", postMessageSchema);
  expect(apostrophe.data.sentMessage.text).toBe("I can't come tonight");

  const angleBrackets = await sendMessage(token, 'use <b> tags? no', postMessageSchema);
  expect(angleBrackets.data.sentMessage.text).toBe('use <b> tags? no');

  const fetched = await fetchMessages(token, '', getMessagesSchema);
  expect(fetched.data.messages.map((m) => m.text)).toEqual([
    "I can't come tonight",
    'use <b> tags? no',
  ]);
});

test('POST/messages: the sent message is immediately visible to another member', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  const reader = await createVolunteer(signInResponse);

  await sendMessage(token, 'everyone sees this');
  const room = await fetchMessages(reader.token, '', getMessagesSchema);
  expect(room.data.messages.map((m) => m.text)).toContain('everyone sees this');
});
