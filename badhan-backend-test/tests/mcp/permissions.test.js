// The MCP layer adds no permission logic and removes none. Every assertion here is really about
// the API's own rules still applying when the caller is an assistant.
const operations = require('../lib/operations');
const { callTool, resultText, createVolunteer, createHallAdmin, mintRedirectionToken } = require('./helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

test('a volunteer calling a super-admin-only tool gets the API 403, as a tool result', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const body = await callTool('list_all_donors', {}, { token });
  expect(body.result.isError).toBe(true);
  // The server's own message, not one this layer invented. The model has to be able to read the
  // reason and stop rather than retry.
  expect(resultText(body)).toContain('HTTP 403');
});

test('a super admin calling the same tool succeeds', async () => {
  // The other half of the assertion above: the 403 is the role, not the tool being broken.
  const signInResponse = await operations.signInSuperAdmin();
  const token = await mintRedirectionToken(signInResponse);

  const body = await callTool('list_all_donors', {}, { token });
  expect(body.result.isError).toBe(false);
  expect(JSON.parse(resultText(body))).toHaveProperty('data');
});

test('a hall admin searching another hall gets the same treatment', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createHallAdmin(signInResponse, { hall: HALLS_INDEX.CHATRI });

  const body = await callTool('search_donors', { hall: HALLS_INDEX.TITUMIR }, { token });
  expect(body.result.isError).toBe(true);
  expect(resultText(body)).toContain('not allowed to search donors of other halls');
});

test('a hall admin searching their own hall is served normally', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createHallAdmin(signInResponse, { hall: HALLS_INDEX.CHATRI });

  const body = await callTool('search_donors', { hall: HALLS_INDEX.CHATRI }, { token });
  expect(body.result.isError).toBe(false);
});

test('a volunteer is served at a volunteer\'s permissions, not refused outright', async () => {
  // Super-admin-only is a gate on the AI Integration PAGE, not on the endpoint. Nothing in the
  // router asks what designation the token's owner has, and nothing should — a volunteer holding
  // a valid token is served exactly as the API already serves them.
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorInfo } = await createVolunteer(signInResponse);

  const body = await callTool('whoami', {}, { token });
  expect(body.result.isError).toBe(false);
  const me = JSON.parse(resultText(body));
  expect(me.donor.designation).toBe(1);
  expect(me.donor.name).toBe(donorInfo.name);
});

test('a plain donor holding a token is refused the member room, by the API\'s rule', async () => {
  // handleVolunteerCheck, exercised through MCP. A demoted member keeps their token until it
  // expires, so this is the state the rule exists for.
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId, token } = await createVolunteer(signInResponse);
  await operations.demoteToDonor(donorId, signInResponse);

  const body = await callTool('list_messages', {}, { token });
  expect(body.result.isError).toBe(true);
});
