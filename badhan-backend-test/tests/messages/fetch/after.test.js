const operations = require('../../lib/operations');
const { getMessagesSchema } = require('../schemas');
const {
  createVolunteer,
  fetchMessages,
  seedMessages,
  seedBurstWithSharedMillisecond,
  sendMessage,
} = require('../helpers');

// GET /messages?after=<ms> — the catch-up read behind the Fetch messages button, the post-send
// refresh and the app-open fetch. This is the suite that has to be right: every rule here exists
// because breaking it LOSES a message silently, on somebody else's device, with nothing on
// screen to say so.

test('GET/messages?after: an up-to-date client is told there is nothing new', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 3);

  const first = await fetchMessages(token, '', getMessagesSchema);
  const caughtUp = await fetchMessages(token, `?after=${first.data.serverTime}`, getMessagesSchema);

  expect(caughtUp.data.messages).toEqual([]);
  expect(caughtUp.data.hasMore).toBe(false);
});

test('GET/messages?after: returns only what arrived after the watermark', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 2, 'old');

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  await sendMessage(token, 'brand new');

  const catchUp = await fetchMessages(token, `?after=${watermark}`, getMessagesSchema);
  expect(catchUp.data.messages.map((m) => m.text)).toEqual(['brand new']);
});

test('GET/messages?after: a message sent after the watermark is delivered next time, never dropped', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // The in-flight case: the server samples `now` BEFORE it queries, so a message written after
  // that sample sits outside the page and outside the watermark, and the next fetch owes it.
  // Sampling after the query instead would drop it into the gap and nothing would ask again.
  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  await sendMessage(token, 'written just after the sample');

  const next = await fetchMessages(token, `?after=${watermark}`, getMessagesSchema);
  expect(next.data.messages.map((m) => m.text)).toEqual(['written just after the sample']);
});

test('GET/messages?after: serverTime never moves backwards across a chain of fetches', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const marks = [];
  let cursor = '';
  for (let round = 0; round < 4; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchMessages(token, cursor, getMessagesSchema);
    marks.push(response.data.serverTime);
    cursor = `?after=${response.data.serverTime}`;
    // eslint-disable-next-line no-await-in-loop
    await sendMessage(token, `round ${round}`);
  }

  expect([...marks].sort((a, b) => a - b)).toEqual(marks);
});

test('GET/messages?after: a truncated catch-up returns the OLDEST rows of the gap', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  await seedMessages(token, 80);

  const page = await fetchMessages(token, `?after=${watermark}&limit=30`, getMessagesSchema);

  expect(page.data.messages.length).toBe(30);
  expect(page.data.hasMore).toBe(true);
  // The oldest 30 of the 80, so the page is CONTIGUOUS with what the client already holds. A
  // descending cut would hand back the newest 30 and leave a hole in the middle that the
  // advancing watermark then closes over permanently.
  expect(page.data.messages[0].text).toBe('m0');
  expect(page.data.messages[29].text).toBe('m29');
});

test('GET/messages?after: a truncated catch-up watermarks at its own last row, not at now', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  await seedMessages(token, 80);

  const page = await fetchMessages(token, `?after=${watermark}&limit=30`, getMessagesSchema);
  const lastReturned = page.data.messages[page.data.messages.length - 1];

  // `now` would claim the client has been shown everything up to this instant, and the fifty
  // messages that did not fit would never be requested by anything.
  expect(page.data.serverTime).toBe(lastReturned.date);
});

test('GET/messages?after: three chained fetches deliver all 80 with no gap and no duplicate', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  await seedMessages(token, 80);

  const collected = [];
  const pageSizes = [];
  let cursor = watermark;
  for (let round = 0; round < 6; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchMessages(token, `?after=${cursor}&limit=30`, getMessagesSchema);
    pageSizes.push(page.data.messages.length);
    collected.push(...page.data.messages.map((m) => m.text));
    if (!page.data.hasMore) break;
    cursor = page.data.serverTime;
  }

  expect(pageSizes).toEqual([30, 30, 20]);
  // Every message exactly once, in order. This single assertion is what the whole cursor design
  // exists to satisfy.
  expect(collected).toEqual(Array.from({ length: 80 }, (_, i) => `m${i}`));
  expect(new Set(collected).size).toBe(80);
});

test('GET/messages?after: the cut never splits a millisecond, and the held-back rows arrive next', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  // A REAL collision. A sequential seed cannot make one — sends land about 3ms apart — so a
  // version of this test built on seedMessages asserts the invariant without ever reaching the
  // case that breaks it.
  const { messages, sharedDate } = await seedBurstWithSharedMillisecond(token, 12);

  // Walk the room in small pages and check the invariant at EVERY boundary, wherever the shared
  // millisecond happens to fall on this run.
  const collected = [];
  let cursor = watermark;
  for (let round = 0; round < 40; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchMessages(token, `?after=${cursor}&limit=2`, getMessagesSchema);
    const returned = page.data.messages;
    expect(returned.length).toBeGreaterThan(0);
    collected.push(...returned.map((m) => m._id));
    if (!page.data.hasMore) break;

    // The watermark is a date the page actually REACHED, never one it only passed over, and
    // `after` is exclusive on the timestamp alone — so if the cut had split the shared
    // millisecond, the rows left on the far side of it would be unreachable forever.
    expect(page.data.serverTime).toBe(returned[returned.length - 1].date);
    cursor = page.data.serverTime;
  }

  // Every message exactly once, including both halves of the shared millisecond.
  expect(collected).toEqual(messages.map((m) => m._id));
  expect(collected.filter((id) => messages.find((m) => m._id === id).date === sharedDate).length)
    .toBeGreaterThan(1);
});

test('GET/messages?after: a page cut inside a shared millisecond returns the whole millisecond or none of it', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const watermark = (await fetchMessages(token, '', getMessagesSchema)).data.serverTime;
  const { messages, sharedDate } = await seedBurstWithSharedMillisecond(token, 12);
  const sharing = messages.filter((m) => m.date === sharedDate);

  // Page through with a limit small enough to land inside the shared group, and assert that no
  // page ever ends part-way through it. A page may come back SHORTER than the limit — that is
  // the trim doing its job, not a failure.
  let cursor = watermark;
  for (let round = 0; round < 40; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchMessages(token, `?after=${cursor}&limit=2`, getMessagesSchema);
    const returnedShared = page.data.messages.filter((m) => m.date === sharedDate);
    if (returnedShared.length > 0 && page.data.hasMore) {
      // Either all of the shared group came back on this page, or the trim dropped the group
      // entirely and left it for the next one.
      expect(returnedShared.length).toBe(sharing.length);
    }
    if (!page.data.hasMore) break;
    cursor = page.data.serverTime;
  }
});

test('GET/messages?after: a watermark from the future returns nothing rather than erroring', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 3);

  // Not a supported client state — the client is told never to use its own clock — but the
  // route must degrade to "nothing new" rather than to a 500.
  const future = Date.now() + 60 * 60 * 1000;
  const response = await fetchMessages(token, `?after=${future}`, getMessagesSchema);
  expect(response.data.messages).toEqual([]);
  expect(response.data.hasMore).toBe(false);
});
