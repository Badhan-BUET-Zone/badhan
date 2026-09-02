// The dispatcher: what happens between a tools/call and a real request through the express stack.
//
// WHY THERE IS NO 429 ASSERTION HERE.
//
// RATE_LIMITER_ENABLE is false in the test environment, and rateLimiter.ts multiplies every
// budget by a million when it is. Tripping mcpLimiter therefore takes sixty million sequential
// requests rather than sixty-one, and the harness has no per-test way to flip the flag — every
// limiter is constructed once, at import, inside a container this suite only reaches over HTTP.
// The same reasoning is already recorded for the message-send, feedback-token and certificate
// suites, and the limiter's per-caller keying is proven by a unit-level check instead.
//
// What IS worth pinning, and what these tests pin, is the SHAPE of what the dispatcher does: that
// a tool call goes through the same validators, query parsing and body parsing the route already
// has, and that MCP's own budget sits above the per-route ones rather than sharing them. Those
// are the failures this file would actually catch.
const operations = require('../lib/operations');
const { callTool, resultText, buildDonorInfo, mintRedirectionToken } = require('./helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

const superAdminToken = async () => {
  const signInResponse = await operations.signInSuperAdmin();
  return { signInResponse, token: await mintRedirectionToken(signInResponse) };
};

test('query parameters survive the replay', async () => {
  // A GET tool's inputs become a query string that express has to parse back. If that broke, the
  // route would see undefined filters and answer with everything — a silent wrong answer rather
  // than an error, which is why it is asserted on a filter that excludes.
  const { signInResponse, token } = await superAdminToken();
  await operations.createDonor(buildDonorInfo({ name: 'Findable Donor', hall: HALLS_INDEX.CHATRI }), signInResponse);

  const matching = await callTool('search_donors', { hall: HALLS_INDEX.CHATRI, name: 'Findable' }, { token });
  const missing = await callTool('search_donors', { hall: HALLS_INDEX.CHATRI, name: 'Nonexistent Person' }, { token });

  expect(JSON.parse(resultText(matching)).filteredDonors.length).toBeGreaterThan(0);
  expect(JSON.parse(resultText(missing)).filteredDonors.length).toBe(0);
});

test('an array-valued query parameter is repeated rather than joined', async () => {
  // find_donor_by_phone is the one tool whose parameter is a list. Sending it as "a,b" would be
  // one malformed phone number rather than two good ones.
  const { signInResponse, token } = await superAdminToken();
  const first = buildDonorInfo();
  const second = buildDonorInfo();
  await operations.createDonor(first, signInResponse);
  await operations.createDonor(second, signInResponse);

  const body = await callTool('find_donor_by_phone', { phoneList: [first.phone, second.phone] }, { token });
  expect(body.result.isError).toBe(false);
  expect(resultText(body)).toContain(String(first.phone));
  expect(resultText(body)).toContain(String(second.phone));
});

test('a request body reaches express.json()', async () => {
  // Without a correct content-type and content-length on the synthetic request, express.json()
  // skips the body and every write tool sees {} — which surfaces as a validation error naming a
  // field the model did send.
  const { signInResponse, token } = await superAdminToken();
  const response = await operations.createDonor(buildDonorInfo(), signInResponse);
  const donorId = response.data.newDonor._id;

  const body = await callTool('update_donor_comment', { donorId, comment: 'through the dispatcher' }, { token });
  expect(body.result.isError).toBe(false);

  const donor = await operations.getDonor(donorId, signInResponse);
  expect(donor.data.donor.comment).toBe('through the dispatcher');
});

test('the route validators run: a missing required field is the API\'s own 400', async () => {
  const { token } = await superAdminToken();
  const body = await callTool('log_donation', { donorId: '000000000000000000000000' }, { token });
  expect(body.result.isError).toBe(true);
  expect(resultText(body)).toContain('HTTP 400');
});

test('an unknown tool is a JSON-RPC error, not a tool result', async () => {
  // The distinction the protocol layer draws: a call that cannot be DISPATCHED is an error, while
  // a call that ran and failed is a result. A client handles the first and a model reads the
  // second.
  const { token } = await superAdminToken();
  const body = await callTool('no_such_tool', {}, { token });
  expect(body.result).toBeUndefined();
  expect(body.error.code).toBe(-32601);
});

test('tools/call without a name is -32602', async () => {
  const { rpc } = require('./helpers');
  const { token } = await superAdminToken();
  const response = await rpc('tools/call', { params: { arguments: {} }, token });
  expect(response.data.error.code).toBe(-32602);
});

test('MCP does not share the per-route budget it dispatches into', async () => {
  // commonLimiter is 12 a minute. mcpLimiter is 60, and it sits ABOVE the per-route budgets
  // rather than replacing them. If /mcp had been wired to commonLimiter — the obvious
  // "simplification" — the thirteenth tool call of an ordinary conversation would 429 with the
  // limiter enabled. Twenty is past that line and well inside MCP's own budget.
  const { token } = await superAdminToken();
  for (let i = 0; i < 20; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const body = await callTool('whoami', {}, { token });
    expect(body.result.isError).toBe(false);
  }
});
