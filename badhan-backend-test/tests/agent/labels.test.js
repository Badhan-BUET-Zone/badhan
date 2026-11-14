// Every tool card in Badhan Agent is headed by a LABEL, not a URL: the route's summary if it has
// one, otherwise the first line of its description in /openapi.json. Members of every rank read
// these, so a route with no description would fall back to a bare operation id, and a first line
// that runs on or quotes a path puts code in front of a volunteer.
//
// Whether a label is *readable* cannot be tested. That it exists, is short and shows no path can.
const { badhanAxios } = require('../../api');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// The routes the agent never offers to the model, so never shows on a card: the ones that act on
// the session it borrows, and its own chat routes.
const SESSION_ROUTES = new Set([
  'POST /users/signin',
  'DELETE /users/signout',
  'DELETE /users/signout/all',
  'PATCH /users/password',
]);
const isAgentRoute = (path) => path === '/agent' || path.startsWith('/agent/');

// Long enough for "List the platelet donations behind one figure in the platelet report (Super
// Admin only)", short enough to stay one line on a phone-width card.
const MAX_LABEL_LENGTH = 90;

const labelOf = (operation) => {
  const summary = (operation.summary || '').trim();
  if (summary) return summary;
  return (operation.description || '').trim().split('\n')[0].trim();
};

async function exposedOperations() {
  const { data: spec } = await badhanAxios.get('/openapi.json');
  return Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) => METHODS.includes(method))
      .map(([method, operation]) => ({ route: `${method.toUpperCase()} ${path}`, path, label: labelOf(operation) }))
      .filter(({ route, path: p }) => !SESSION_ROUTES.has(route) && !isAgentRoute(p))
  );
}

test('every route the agent can call has a label: a summary or a first line of description', async () => {
  const operations = await exposedOperations();
  expect(operations.length).toBeGreaterThan(0);

  const unlabelled = operations.filter((o) => o.label === '').map((o) => o.route);
  expect(unlabelled).toEqual([]);
});

test('every label fits on one card line and shows no path', async () => {
  const operations = await exposedOperations();

  const tooLong = operations
    .filter((o) => o.label.length > MAX_LABEL_LENGTH)
    .map((o) => `${o.route}: ${o.label}`);
  expect(tooLong).toEqual([]);

  // A slash in a label is a URL or a path, which is exactly what the card no longer shows.
  const showsAPath = operations.filter((o) => o.label.includes('/')).map((o) => `${o.route}: ${o.label}`);
  expect(showsAPath).toEqual([]);
});
