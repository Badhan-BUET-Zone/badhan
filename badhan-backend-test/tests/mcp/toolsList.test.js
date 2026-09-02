// The table itself. This is the file that catches a tool added without annotations, or with a
// schema that promises something the route does not accept.
const { validateSchema } = require('../lib/http');
const operations = require('../lib/operations');
const { rpc, mintRedirectionToken } = require('./helpers');
const { jsonRpcResultSchema, toolsListResultSchema } = require('./schemas');

const listTools = async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRedirectionToken(signInResponse);
  const response = await rpc('tools/list', { token });
  expect(response.status).toBe(200);
  validateSchema(response.data, jsonRpcResultSchema(toolsListResultSchema));
  return response.data.result.tools;
};

test('tools/list: every tool has a name, a title, a description and annotations', async () => {
  // The schema does the per-tool work; this asserts the list is not empty and the names are
  // unique, which a schema cannot express.
  const tools = await listTools();
  const names = tools.map((tool) => tool.name);
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names).size).toBe(names.length);
});

test('tools/list: every inputSchema is a usable JSON Schema object', async () => {
  const tools = await listTools();
  tools.forEach((tool) => {
    const schema = tool.inputSchema;
    expect(schema.type).toBe('object');
    expect(typeof schema.properties).toBe('object');

    // A required key that is not a property is a schema no client can satisfy.
    (schema.required || []).forEach((key) => {
      expect(Object.keys(schema.properties)).toContain(key);
    });

    // The schema is the only thing a model reads about a parameter, so an undescribed one is a
    // parameter it will guess at.
    Object.entries(schema.properties).forEach(([key, property]) => {
      const described = typeof property.description === 'string' || property.type === 'array';
      expect(`${tool.name}.${key} described: ${described}`).toBe(`${tool.name}.${key} described: true`);
    });
  });
});

test('tools/list: every tool that deletes a record is destructiveHint', async () => {
  // destructiveHint is what an MCP client reads to decide whether to ask the human first, and it
  // is the mechanism that makes full write access survivable. Note the rule is "deletes a
  // record", not "is backed by an HTTP DELETE": unbookmark_donor is a DELETE that loses nothing.
  const tools = await listTools();
  const deleters = tools.filter((tool) => tool.name.startsWith('delete_'));
  expect(deleters.length).toBeGreaterThan(0);
  deleters.forEach((tool) => {
    expect(`${tool.name} destructive: ${tool.annotations.destructiveHint}`)
      .toBe(`${tool.name} destructive: true`);
    expect(tool.annotations.readOnlyHint).toBe(false);
  });
});

test('tools/list: the whole-record rewrites are flagged too', async () => {
  // These are not deletions and would pass the rule above, but each one silently discards data
  // when a model sends a partial body. They are the likeliest first casualty of write access.
  const tools = await listTools();
  ['update_donor', 'update_donor_comment', 'change_designation'].forEach((name) => {
    const tool = tools.find((candidate) => candidate.name === name);
    expect(`${name} present: ${Boolean(tool)}`).toBe(`${name} present: true`);
    expect(`${name} destructive: ${tool.annotations.destructiveHint}`).toBe(`${name} destructive: true`);
  });
});

test('tools/list: a read tool is readOnlyHint and a write tool is not', async () => {
  const tools = await listTools();
  const readOnly = (name) => tools.find((tool) => tool.name === name).annotations.readOnlyHint;
  expect(readOnly('whoami')).toBe(true);
  expect(readOnly('search_donors')).toBe(true);
  expect(readOnly('log_donation')).toBe(false);
  expect(readOnly('send_message')).toBe(false);
});

test('update_donor: the description carries the read-modify-write instruction', async () => {
  // PATCH /donors/v2 takes a FULL donor body, so a model that sends three fields wipes the rest.
  // The annotation moves the decision to the client's confirmation prompt; only the description
  // can stop the model from assembling the body wrongly in the first place.
  const tools = await listTools();
  const { description } = tools.find((tool) => tool.name === 'update_donor');
  expect(description).toContain('NOT A PARTIAL UPDATE');
  expect(description).toContain('get_donor first');
});

test('tools/list: the credential routes are deliberately absent', async () => {
  // A tool that mints a token from a token turns a 30-minute grant into an unbounded one, and a
  // tool that signs out ends the session the caller's own token hangs off. Neither is an
  // oversight, so both are pinned here.
  const tools = await listTools();
  const names = tools.map((tool) => tool.name);
  ['signin', 'sign_in', 'redirection', 'signout', 'sign_out', 'change_password'].forEach((forbidden) => {
    expect(names).not.toContain(forbidden);
  });
  expect(JSON.stringify(tools)).not.toContain('/users/redirection');
});
