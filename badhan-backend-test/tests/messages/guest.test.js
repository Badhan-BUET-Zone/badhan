const operations = require('../lib/operations');
const { getMessagesSchema, postMessageSchema, deleteMessageSchema } = require('./schemas');

// Guest mode prefixes every call with /guest and answers from faker. Nothing on the frontend
// branches on guest mode for this feature — the base-URL rewrite does all of it — so these
// mirrors are what keep a demo from either failing outright or, worse, posting demo chatter into
// the room every real member reads.
//
// The schemas are the ones the REAL routes are checked against, deliberately. A mirror whose
// shape has drifted is a demo that works and a production build that does not.

test('GET/guest/messages: the newest page of a fixed room, in the real element shape', async () => {
  const response = await operations.guestGet('/guest/messages', getMessagesSchema);

  expect(response.data.messages.length).toBe(30);
  expect(response.data.hasMore).toBe(true);

  const dates = response.data.messages.map((m) => m.date);
  expect([...dates].sort((a, b) => a - b)).toEqual(dates);

  // One row deliberately has no sender, so a demo also shows how a message from a member whose
  // record has since been deleted renders.
  expect(response.data.messages.some((m) => m.sender === null)).toBe(true);
});

test('GET/guest/messages: the room is stable across requests, or paging would be nonsense', async () => {
  const first = await operations.guestGet('/guest/messages', getMessagesSchema);
  const second = await operations.guestGet('/guest/messages', getMessagesSchema);

  // Every other guest route fabricates a fresh payload per request. This one cannot: the panel
  // pages, and a set rebuilt per request would hand the scroller thirty different messages with
  // thirty different timestamps on its second page.
  expect(second.data.messages).toEqual(first.data.messages);
});

test('GET/guest/messages?after: nothing new ever arrives in a demo, and it says so', async () => {
  const first = await operations.guestGet('/guest/messages', getMessagesSchema);
  const caughtUp = await operations.guestGet(
    `/guest/messages?after=${first.data.serverTime}`,
    getMessagesSchema
  );

  // Truthful rather than invented: a Fetch messages button that conjured traffic would be
  // contradicted by the very next press.
  expect(caughtUp.data.messages).toEqual([]);
  expect(caughtUp.data.hasMore).toBe(false);
});

test('GET/guest/messages?before: scrolling up walks the whole room once and then stops', async () => {
  const collected = [];
  let page = (await operations.guestGet('/guest/messages?limit=15', getMessagesSchema)).data;
  collected.unshift(...page.messages.map((m) => m._id));

  for (let guard = 0; guard < 20 && page.hasMore; guard += 1) {
    const oldest = page.messages[0];
    // eslint-disable-next-line no-await-in-loop
    page = (
      await operations.guestGet(
        `/guest/messages?before=${oldest.date}&beforeId=${oldest._id}&limit=15`,
        getMessagesSchema
      )
    ).data;
    collected.unshift(...page.messages.map((m) => m._id));
  }

  // hasMore really does go false at the top of the history. A scroller that is lied to never
  // stops asking.
  expect(page.hasMore).toBe(false);
  expect(collected.length).toBe(40);
  expect(new Set(collected).size).toBe(40);
});

test('GET/guest/messages: limit is clamped rather than refused, like the real route', async () => {
  const response = await operations.guestGet('/guest/messages?limit=500', getMessagesSchema);
  expect(response.data.messages.length).toBe(40);
  expect(response.data.hasMore).toBe(false);
});

test('POST/guest/messages: echoes the sender their own words and stores nothing', async () => {
  const before = await operations.guestGet('/guest/messages', getMessagesSchema);

  const sent = await operations.guestPost(
    '/guest/messages',
    { text: '  a message typed in the demo  ' },
    postMessageSchema
  );
  expect(sent.status).toBe(201);
  expect(sent.data.sentMessage.text).toBe('a message typed in the demo');
  expect(sent.data.sentMessage.sender).not.toBeNull();

  // It does not join the room: a demo that accumulated messages would drift further from its
  // own scroll positions the longer somebody played with it.
  const after = await operations.guestGet('/guest/messages', getMessagesSchema);
  expect(after.data.messages).toEqual(before.data.messages);
});

test('DELETE/guest/messages: takes messageId as a query parameter and removes nothing', async () => {
  const before = await operations.guestGet('/guest/messages', getMessagesSchema);
  const target = before.data.messages[0];

  // A query parameter, like its real counterpart and like DELETE /guest/feedbacks. A guest route
  // that took it differently would work in a demo and 404 in production.
  await operations.guestDelete(`/guest/messages?messageId=${target._id}`, deleteMessageSchema);

  const after = await operations.guestGet('/guest/messages', getMessagesSchema);
  expect(after.data.messages).toEqual(before.data.messages);
});

test('the guest mirror needs no session on any of the three routes', async () => {
  // The real routes answer 401 to exactly these calls. That asymmetry is the entire point of
  // mirroring the feature rather than hiding it in demo mode.
  await operations.guestGet('/guest/messages', getMessagesSchema);
  await operations.guestPost('/guest/messages', { text: 'no token here' }, postMessageSchema);
  await operations.guestDelete('/guest/messages?messageId=anything', deleteMessageSchema);
});
