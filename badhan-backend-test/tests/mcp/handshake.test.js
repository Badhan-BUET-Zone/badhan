// The three parts of the handshake that a strict MCP client will drop the connection over.
const { validateSchema } = require('../lib/http');
const { rpc, rpcRaw, notify, expectStatus } = require('./helpers');
const {
  jsonRpcResultSchema,
  jsonRpcErrorSchema,
  initializeResultSchema,
} = require('./schemas');

const JSON_RPC_METHOD_NOT_FOUND = -32601;
const JSON_RPC_INVALID_REQUEST = -32600;
const HTTP_ACCEPTED = 202;
const HTTP_METHOD_NOT_ALLOWED = 405;

test('initialize: answers the handshake without a token', async () => {
  // Deliberately unauthenticated. A client that cannot complete a handshake reports "server
  // unreachable" rather than "not authorized", and the difference is a support conversation.
  const response = await rpc('initialize', { params: { protocolVersion: '2025-06-18' } });
  expect(response.status).toBe(200);
  validateSchema(response.data, jsonRpcResultSchema(initializeResultSchema));
  expect(response.data.result.capabilities.tools.listChanged).toBe(false);
});

test('initialize: a supported protocol version is echoed back', async () => {
  const response = await rpc('initialize', { params: { protocolVersion: '2025-03-26' } });
  expect(response.data.result.protocolVersion).toBe('2025-03-26');
});

test('initialize: an unsupported version gets ours rather than a 400', async () => {
  // Negotiation echoes, it does not assert: the failure mode must be a client that declines to
  // continue, never a transport error it cannot interpret.
  const response = await rpc('initialize', { params: { protocolVersion: '1999-01-01' } });
  expect(response.status).toBe(200);
  expect(response.data.result.protocolVersion).toBe('2025-06-18');
});

test('initialize: instructions carry the encoding vocabulary', async () => {
  // The one copy of it lives in src/doc/apiVocabulary.ts and is read by both the OpenAPI spec and
  // this handshake. A model that never sees it sends "B+" where a 2 belongs.
  const response = await rpc('initialize');
  const { instructions } = response.data.result;
  expect(instructions).toContain('Blood group');
  expect(instructions).toContain('`2` B+');
  expect(instructions).toContain('milliseconds');
});

test('notifications/initialized: 202 with a zero-length body', async () => {
  // A JSON-RPC message with no id is a notification. Answering one with {"id":null,...} makes a
  // strict client drop the connection, so the assertion is on the BYTES, not just the status.
  const response = await notify('notifications/initialized');
  expect(response.status).toBe(HTTP_ACCEPTED);
  expect(response.data).toBe('');
});

test('ping: answers an empty result', async () => {
  const response = await rpc('ping');
  expect(response.status).toBe(200);
  expect(response.data.result).toEqual({});
});

test('an unknown method is -32601 at HTTP 200', async () => {
  // HTTP 200 matters as much as the code: JSON-RPC carries its own errors, and a transport-level
  // failure here would be handled by the client instead of reaching the model. A token is needed
  // because only initialize and ping are answered without one — an unknown method is not.
  const operations = require('../lib/operations');
  const { mintRedirectionToken } = require('./helpers');
  const token = await mintRedirectionToken(await operations.signInSuperAdmin());
  const response = await rpc('nope', { token });
  expect(response.status).toBe(200);
  validateSchema(response.data, jsonRpcErrorSchema(JSON_RPC_METHOD_NOT_FOUND));
});

test('a batch answers the requests and omits the notifications', async () => {
  const response = await rpcRaw([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 'a', method: 'ping' },
    { jsonrpc: '2.0', id: 'b', method: 'ping' },
  ]);
  expect(response.status).toBe(200);
  expect(response.data.map((entry) => entry.id)).toEqual(['a', 'b']);
});

test('a batch of nothing but notifications is 202 with no body', async () => {
  const response = await rpcRaw([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', method: 'notifications/cancelled' },
  ]);
  expect(response.status).toBe(HTTP_ACCEPTED);
  expect(response.data).toBe('');
});

test('a body that is not a JSON-RPC request is -32600', async () => {
  // It carries an id, so it is a request rather than a notification, and a request gets an answer.
  const response = await rpcRaw({ jsonrpc: '1.0', id: 7, method: 'ping' });
  expect(response.status).toBe(200);
  validateSchema(response.data, jsonRpcErrorSchema(JSON_RPC_INVALID_REQUEST));
});

test('a message with no id is a notification, however malformed', async () => {
  // Presence of the key is the whole test for a notification. Answering one — even to complain
  // about its shape — is what makes a strict client drop the connection.
  const response = await rpcRaw({ hello: 'there' });
  expect(response.status).toBe(HTTP_ACCEPTED);
  expect(response.data).toBe('');
});

test('GET and DELETE are 405 and say why', async () => {
  // The session half of streamable HTTP. This server is stateless and has neither an event stream
  // nor a session to end; a client author meeting a bare 405 would assume a routing mistake.
  const { badhanAxios } = require('../../api');
  for (const method of ['get', 'delete']) {
    // eslint-disable-next-line no-await-in-loop
    const response = await expectStatus(() => badhanAxios[method]('/mcp'), HTTP_METHOD_NOT_ALLOWED);
    validateSchema(response.data, jsonRpcErrorSchema());
    expect(response.data.error.message).toContain('stateless');
  }
});
