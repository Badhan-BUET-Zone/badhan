const operations = require('../../lib/operations');
const { getMessagesSchema } = require('../schemas');
const {
  createVolunteer,
  fetchMessages,
  seedMessages,
  seedBurstWithSharedMillisecond,
  expectStatus,
} = require('../helpers');

// GET /messages?before=<ms>&beforeId=<id> — the scroll-up read.
//
// The cursor here points at a MESSAGE rather than at an instant, and both halves are required.
// That asymmetry with the `after` cursor is the whole subject of this file.

test('GET/messages?before: hands back the page older than the given message', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 12);

  const newest = await fetchMessages(token, '?limit=5', getMessagesSchema);
  expect(newest.data.messages.map((m) => m.text)).toEqual(['m7', 'm8', 'm9', 'm10', 'm11']);

  const oldestOnPage = newest.data.messages[0];
  const older = await fetchMessages(
    token,
    `?before=${oldestOnPage.date}&beforeId=${oldestOnPage._id}&limit=5`,
    getMessagesSchema
  );

  // Oldest-first here too, so the frontend splices rather than reverses.
  expect(older.data.messages.map((m) => m.text)).toEqual(['m2', 'm3', 'm4', 'm5', 'm6']);
  expect(older.data.hasMore).toBe(true);
});

test('GET/messages?before: hasMore goes false at the start of history', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 7);

  const newest = await fetchMessages(token, '?limit=5', getMessagesSchema);
  const oldestOnPage = newest.data.messages[0];
  const older = await fetchMessages(
    token,
    `?before=${oldestOnPage.date}&beforeId=${oldestOnPage._id}&limit=5`,
    getMessagesSchema
  );

  expect(older.data.messages.map((m) => m.text)).toEqual(['m0', 'm1']);
  // Nothing older exists, so the scroller stops asking.
  expect(older.data.hasMore).toBe(false);
});

test('GET/messages?before: paging all the way back delivers every message exactly once', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 23);

  const collected = [];
  let page = await fetchMessages(token, '?limit=5', getMessagesSchema);
  collected.unshift(...page.data.messages.map((m) => m.text));

  while (page.data.hasMore) {
    const oldestOnPage = page.data.messages[0];
    // eslint-disable-next-line no-await-in-loop
    page = await fetchMessages(
      token,
      `?before=${oldestOnPage.date}&beforeId=${oldestOnPage._id}&limit=5`,
      getMessagesSchema
    );
    collected.unshift(...page.data.messages.map((m) => m.text));
  }

  expect(collected).toEqual(Array.from({ length: 23 }, (_, i) => `m${i}`));
  expect(new Set(collected).size).toBe(23);
});

test('GET/messages?before: a boundary inside a shared millisecond drops nothing', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // A real collision, not a hoped-for one: seedBurstWithSharedMillisecond fails rather than
  // letting this test pass without exercising the case it exists for.
  const { messages, sharedCount } = await seedBurstWithSharedMillisecond(token, 12);
  expect(sharedCount).toBeGreaterThan(1);

  // limit=1 walks EVERY boundary, so the cut is guaranteed to land between the two messages
  // that share a millisecond. A plain { date: { $lt: before } } cursor skips the second of that
  // pair forever, and the reader scrolling up never learns it existed.
  const collected = [];
  let page = await fetchMessages(token, '?limit=1', getMessagesSchema);
  collected.unshift(...page.data.messages.map((m) => m.text));

  for (let guard = 0; guard < 50 && page.data.hasMore; guard += 1) {
    const oldestOnPage = page.data.messages[0];
    // eslint-disable-next-line no-await-in-loop
    page = await fetchMessages(
      token,
      `?before=${oldestOnPage.date}&beforeId=${oldestOnPage._id}&limit=1`,
      getMessagesSchema
    );
    collected.unshift(...page.data.messages.map((m) => m.text));
  }

  expect(page.data.hasMore).toBe(false);
  expect(collected).toEqual(messages.map((m) => m.text));
  expect(new Set(collected).size).toBe(messages.length);
});

test('GET/messages?before: two messages sharing a millisecond are returned across two pages, never one', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const { messages, sharedDate } = await seedBurstWithSharedMillisecond(token, 12);
  const sharing = messages.filter((m) => m.date === sharedDate);
  expect(sharing.length).toBeGreaterThan(1);

  // Cut exactly at the newer half of the pair. The older half shares its millisecond and must
  // still come back — which only works because the cursor carries beforeId as well as before.
  const newerHalf = sharing[sharing.length - 1];
  const older = await fetchMessages(
    token,
    `?before=${newerHalf.date}&beforeId=${newerHalf._id}&limit=30`,
    getMessagesSchema
  );

  expect(older.data.messages.map((m) => m._id)).toContain(sharing[sharing.length - 2]._id);
  // And the cursor message itself is excluded — the page is strictly older.
  expect(older.data.messages.map((m) => m._id)).not.toContain(newerHalf._id);
});

test('GET/messages?before: requires a session', async () => {
  await expectStatus(
    () => operations.guestGet('/messages?before=1700000000000&beforeId=5e6b8b3f1c9d440000a1b2c3'),
    401
  );
});
