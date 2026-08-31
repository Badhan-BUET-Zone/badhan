const operations = require('../../lib/operations');
const { postMessageSchema, getMessagesSchema } = require('../schemas');
const { createVolunteer, sendMessage, fetchMessages } = require('../helpers');

// POST /messages carries messageSendLimiter — 20 sends a minute, its own budget rather than
// commonLimiter's.
//
// WHY THERE IS NO 429 ASSERTION HERE.
//
// RATE_LIMITER_ENABLE is false in the test environment, and rateLimiter.ts multiplies every
// budget by 100 when it is. Tripping the send limiter therefore takes 2001 sequential requests
// rather than 21, and the harness has no per-test way to flip the flag — the limiter is
// constructed once, at import, inside a container this suite only reaches over HTTP. The same
// reasoning is already recorded for the feedback-token and certificate suites.
//
// What IS worth pinning, and what these tests do pin, is the budget's SHAPE: that sending is not
// sharing the read budget, and that a burst a real conversation would produce does not 429. That
// is the failure this file would actually catch — a route wired to the wrong limiter — and it is
// checkable without the flag.

test('POST/messages: a burst well past the read budget still succeeds', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  // commonLimiter is 12/minute. If POST were ever wired to it — the obvious "simplification",
  // since GET already uses it — the fourteenth message of a lively exchange would 429 with the
  // limiter enabled. Twenty sends is the documented budget and a real back-and-forth's worth.
  for (let i = 0; i < 20; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sendMessage(token, `burst ${i}`, postMessageSchema);
    expect(response.status).toBe(201);
  }

  const room = await fetchMessages(token, '?limit=100', getMessagesSchema);
  expect(room.data.messages.length).toBe(20);
});

test('GET/messages: reading a long history is not throttled by the send budget', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await sendMessage(token, 'something to read');

  // Scrolling issues one request per page, and a reader must never spend the budget for
  // talking. Twenty-five reads is more than the send budget allows and must still pass.
  for (let i = 0; i < 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchMessages(token, '?limit=5', getMessagesSchema);
    expect(response.status).toBe(200);
  }
});
