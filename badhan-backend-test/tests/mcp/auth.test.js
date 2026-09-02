// Where the token comes from, and what happens when it is absent, junk, or in two places at once.
//
// Every carrier is exercised, because two of them are code paths nothing else in this folder
// touches: a path token and a Bearer header reach the same handler by different routes, and only
// the x-auth one would otherwise be tested.
const { validateSchema } = require('../lib/http');
const { badhanAxios } = require('../../api');
const operations = require('../lib/operations');
const { rpc, callTool, resultText, expectStatus, mintRedirectionToken } = require('./helpers');
const { jsonRpcErrorSchema, toolCallResultSchema, jsonRpcResultSchema } = require('./schemas');

const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;

const JUNK_TOKEN = 'not-a-jwt';

describe.each(['header', 'bearer', 'path'])('token carried in the %s', (carrier) => {
  test('a valid redirection token authenticates a tool call', async () => {
    // The credential is the one the AI Integration page mints — no new credential class, no API
    // key table. This is the assertion that the page's output actually works.
    const signInResponse = await operations.signInSuperAdmin();
    const token = await mintRedirectionToken(signInResponse);

    const body = await callTool('whoami', {}, { token, carrier });
    validateSchema(body, jsonRpcResultSchema(toolCallResultSchema));
    expect(body.result.isError).toBe(false);
    expect(JSON.parse(resultText(body)).donor.designation).toBe(3);
  });

  test('a junk token is a tool RESULT carrying the API 401, not a transport error', async () => {
    // This distinction is the whole reason a 403 or 401 from Badhan is useful rather than fatal:
    // a JSON-RPC error is handled by the client and often never reaches the model, while an
    // isError result is text the model reads and can act on.
    const body = await callTool('whoami', {}, { token: JUNK_TOKEN, carrier });
    expect(body.error).toBeUndefined();
    expect(body.result.isError).toBe(true);
    expect(resultText(body)).toContain('Invalid Authentication');
  });
});

test('a tool call with no token at all is 401 with a JSON-RPC error body', async () => {
  const response = await expectStatus(
    () => rpc('tools/call', { params: { name: 'whoami', arguments: {} } }),
    HTTP_UNAUTHORIZED
  );
  validateSchema(response.data, jsonRpcErrorSchema());
  // The message has to name all three carriers: a member who cannot type a header needs to be
  // told the path form exists.
  expect(response.data.error.message).toContain('x-auth');
  expect(response.data.error.message).toContain('/mcp/<token>');
});

test('tools/list with no token is 401', async () => {
  await expectStatus(() => rpc('tools/list'), HTTP_UNAUTHORIZED);
});

test('initialize and ping need no token even when everything else does', async () => {
  const initialize = await rpc('initialize');
  const ping = await rpc('ping');
  expect(initialize.status).toBe(200);
  expect(ping.status).toBe(200);
});

test('a request carrying both a header and a path token uses the header', async () => {
  // First one found wins, and a request carrying two is not an error worth inventing. The header
  // must win, or a stale connector URL would silently override the credential a client was
  // configured with.
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRedirectionToken(signInResponse);

  const response = await badhanAxios.post(
    `/mcp/${JUNK_TOKEN}`,
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'whoami', arguments: {} } },
    { headers: { 'x-auth': token } }
  );
  expect(response.data.result.isError).toBe(false);
});

test('GET /mcp/<token> is 405 rather than a 200 a browser could follow', async () => {
  // A token in a path is a token a browser can be pointed at. Answering a GET with anything but a
  // refusal would put a live credential in a history entry and a Referer header.
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRedirectionToken(signInResponse);
  await expectStatus(() => badhanAxios.get(`/mcp/${token}`), HTTP_METHOD_NOT_ALLOWED);
});

test('an expired-looking token is refused by the API, not by the MCP layer', async () => {
  // Nothing in the router calls handleAuthentication: the token is carried into the dispatched
  // request and checked once, by the middleware that already owns that job. The evidence is that
  // the message comes back in the API's own words.
  const body = await callTool('whoami', {}, { token: `${JUNK_TOKEN}.a.b` });
  expect(resultText(body)).toContain('Invalid Authentication');
});
