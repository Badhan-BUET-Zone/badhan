// /llms.txt is the compact rendering of /openapi.json that the AI Integration setup file sends an
// assistant to. It is only worth anything if it is complete, so this reads both off the running
// server and checks that every operation the spec documents has its own section in the Markdown,
// and that the encoding vocabulary — the part a guessing assistant gets wrong — made it across.
const { badhanAxios } = require('../../api');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

test('GET /llms.txt: covers every operation in /openapi.json, as plain text', async () => {
  const [specResponse, llmsResponse] = await Promise.all([
    badhanAxios.get('/openapi.json'),
    badhanAxios.get('/llms.txt', { responseType: 'text', transformResponse: (body) => body }),
  ]);

  expect(llmsResponse.status).toBe(200);
  expect(llmsResponse.headers['content-type']).toMatch(/^text\/plain/);

  const markdown = llmsResponse.data;
  const spec = specResponse.data;

  const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter((method) => METHODS.includes(method))
      .map((method) => `${method.toUpperCase()} ${path}`)
  );
  expect(operations.length).toBeGreaterThan(0);

  const headings = new Set(markdown.split('\n').filter((line) => line.startsWith('### ')).map((line) => line.slice(4)));
  const missing = operations.filter((operation) => !headings.has(operation));
  expect(missing).toEqual([]);

  expect(markdown).toContain('## How values are encoded');
  expect(markdown).toContain('`x-auth` header');

  // The point of the file is to be small enough to read whole; if it creeps back toward the size of
  // the spec, something has started inlining what it should not.
  expect(markdown.length).toBeLessThan(JSON.stringify(spec, null, 2).length / 3);
});
