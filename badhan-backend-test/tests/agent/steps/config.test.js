const operations = require('../../lib/operations');
const { badhanAxios } = require('../../../api');
const { configSchema } = require('../schemas');
const {
  createVolunteer,
  createHallAdmin,
  createSuperAdmin,
  createDemotedMemberHoldingToken,
  asSignIn,
  getConfig,
  expectStatus,
} = require('../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// GET /agent/config — whether the agent can run here, and, for super admins only, the prompt.

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const SESSION_ROUTES = new Set([
  'POST /users/signin',
  'DELETE /users/signout',
  'DELETE /users/signout/all',
  'POST /users/redirection',
  'PATCH /users/password',
]);

test('GET/agent/config: not configured here, with the fixed model and a tool count', async () => {
  // The suite's backend has no OpenAI key (env.local carries none), and that is what the step
  // tests rely on to never make a billed call.
  const signInResponse = await operations.signInSuperAdmin();
  const volunteer = await createVolunteer(signInResponse);

  const response = await getConfig(volunteer.token, configSchema);
  expect(response.data.configured).toBe(false);
  expect(response.data.model).toBe('gpt-6-luna');
  expect(response.data.toolCount).toBeGreaterThan(0);
});

test('GET/agent/config: every route is a tool except the five session routes and the agent\'s own', async () => {
  // So the exclusion cannot quietly break: if an /agent route ever became a tool, the model could
  // read other members' chats or drive its own.
  const signInResponse = await operations.signInSuperAdmin();
  const volunteer = await createVolunteer(signInResponse);
  const { data: spec } = await badhanAxios.get('/openapi.json');

  const all = Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((method) => METHODS.includes(method))
      .map((method) => ({ route: `${method.toUpperCase()} ${path}`, path }))
  );
  const agentRoutes = all.filter((o) => o.path === '/agent' || o.path.startsWith('/agent/'));
  const sessionRoutes = all.filter((o) => SESSION_ROUTES.has(o.route));
  expect(agentRoutes.length).toBeGreaterThan(0);
  expect(sessionRoutes).toHaveLength(SESSION_ROUTES.size);

  const response = await getConfig(volunteer.token, configSchema);
  expect(response.data.toolCount).toBe(all.length - agentRoutes.length - sessionRoutes.length);
});

test('GET/agent/config: a super admin gets the system prompt, with their own session note', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const admin = await createSuperAdmin(signInResponse, { name: 'Prompt Reader', hall: HALLS_INDEX.SUHRAWARDY });

  const response = await getConfig(admin.token, configSchema);
  const prompt = response.data.systemPrompt;

  expect(typeof prompt).toBe('string');
  expect(prompt).toContain('You are Badhan AI');
  // The one line that changed when approval stopped being a setting.
  expect(prompt).toContain('The app asks the user to approve it, and they may decline.');
  expect(prompt).not.toContain('The app may ask the user to approve it.');
  // The scope rule that stops members using it as a general chatbot.
  expect(prompt).toContain('- Help only with Badhan\'s work: donors, donations, blood requests, call records, reports and using the Badhan app. Decline anything else in one sentence, and say what you can help with instead.');
  // The call marker, in the exact form the page turns into a Call button.
  expect(prompt).toContain('write [[call:ID]] right after that donor\'s name');
  // The value codes, imported from the backend's own vocabulary.
  expect(prompt).toContain('## How values are encoded');
  // The session note.
  expect(prompt).toContain('## Session');
  expect(prompt).toContain('- Signed in as: Prompt Reader (Super Admin, Suhrawardy)');
  expect(prompt).toMatch(/- Current time: .+ — \d{13} in Unix milliseconds \(time zone Asia\/Dhaka\)/);
});

test('GET/agent/config: volunteers and hall admins get no systemPrompt field at all', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const volunteer = await createVolunteer(signInResponse);
  const hallAdmin = await createHallAdmin(signInResponse);

  for (const member of [volunteer, hallAdmin]) {
    // eslint-disable-next-line no-await-in-loop
    const response = await getConfig(member.token, configSchema);
    expect(response.data).not.toHaveProperty('systemPrompt');
  }
});

test('GET/agent/config: 401 without a token, 403 for a demoted member', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const demoted = await createDemotedMemberHoldingToken(signInResponse);

  await expectStatus(() => operations.guestGet('/agent/config'), 401);
  await expectStatus(() => operations.authedGet('/agent/config', asSignIn(demoted.token)), 403);
});
