// Writes through MCP. The audit trail is the reason write access is acceptable at all, so it is
// asserted rather than assumed.
const operations = require('../lib/operations');
const { callTool, resultText, buildDonorInfo, mintRedirectionToken } = require('./helpers');

const superAdminToken = async () => {
  const signInResponse = await operations.signInSuperAdmin();
  return { signInResponse, token: await mintRedirectionToken(signInResponse) };
};

// A donor to write against, created through the ordinary API so the test is about the write that
// follows rather than about create_donor.
const seedDonor = async (signInResponse) => {
  const response = await operations.createDonor(buildDonorInfo(), signInResponse);
  return response.data.newDonor._id;
};

test('log_donation creates the donation and the API can see it', async () => {
  const { signInResponse, token } = await superAdminToken();
  const donorId = await seedDonor(signInResponse);
  const date = Date.now();

  const body = await callTool('log_donation', { donorId, date }, { token });
  expect(body.result.isError).toBe(false);

  // Read it back through the ordinary API, not through MCP: a write that only MCP can see is a
  // write that did not happen.
  const donor = await operations.getDonor(donorId, signInResponse);
  expect(donor.data.donor.donations.map((donation) => donation.date)).toContain(date);
});

test('a write through MCP shows up in the activity log, attributed to the caller', async () => {
  // The App Activity page is what makes an assistant's actions reviewable, and it is the entire
  // reason "the server can write" was an acceptable decision.
  const { signInResponse, token } = await superAdminToken();
  const donorId = await seedDonor(signInResponse);

  await callTool('log_donation', { donorId, date: Date.now() }, { token });

  const logs = await operations.authedGet('/log', signInResponse);
  const inserted = logs.data.logs.filter((row) => row.operation === 'POST DONATIONS');
  expect(inserted.length).toBeGreaterThan(0);
  // Attributed to the member whose token it was, not to "an assistant" — the app has no such
  // concept, and that is the point.
  expect(inserted[inserted.length - 1].name).toBe('Mir Mahathir Mohammad');
});

test('create_donor then get_donor: a body sent through MCP reaches the validators intact', async () => {
  const { signInResponse, token } = await superAdminToken();
  const donorInfo = buildDonorInfo({ name: 'Created Through MCP' });

  const created = await callTool('create_donor', donorInfo, { token });
  expect(created.result.isError).toBe(false);
  const donorId = JSON.parse(resultText(created)).newDonor._id;

  const fetched = await callTool('get_donor', { donorId }, { token });
  const donor = JSON.parse(resultText(fetched)).donor;
  expect(donor.name).toBe('Created Through MCP');
  expect(donor.bloodGroup).toBe(donorInfo.bloodGroup);
  expect(String(donor.studentId)).toBe(String(donorInfo.studentId));
});

test('a write that breaks a validation rule comes back as the API 400, not a crash', async () => {
  // The dispatcher replays through the real express stack precisely so the validators run. If it
  // ever stopped doing that, this is the test that would notice: the tools would start accepting
  // bodies the API rejects.
  const { token } = await superAdminToken();

  const body = await callTool('create_donor', { ...buildDonorInfo(), studentId: 'nope' }, { token });
  expect(body.result.isError).toBe(true);
  expect(resultText(body)).toContain('HTTP 400');
});

test('delete_donation removes what log_donation added', async () => {
  const { signInResponse, token } = await superAdminToken();
  const donorId = await seedDonor(signInResponse);
  const date = Date.now();

  await callTool('log_donation', { donorId, date }, { token });
  const deleted = await callTool('delete_donation', { donorId, date }, { token });
  expect(deleted.result.isError).toBe(false);

  const donor = await operations.getDonor(donorId, signInResponse);
  expect(donor.data.donor.donations.map((donation) => donation.date)).not.toContain(date);
});

test('send_message posts to the room and list_messages reads it back', async () => {
  const { token } = await superAdminToken();

  const sent = await callTool('send_message', { text: 'posted through mcp' }, { token });
  expect(sent.result.isError).toBe(false);

  const room = await callTool('list_messages', {}, { token });
  const texts = JSON.parse(resultText(room)).messages.map((message) => message.text);
  expect(texts).toContain('posted through mcp');
});

test('bookmark_donor and unbookmark_donor round-trip', async () => {
  const { signInResponse, token } = await superAdminToken();
  const donorId = await seedDonor(signInResponse);

  const added = await callTool('bookmark_donor', { donorId }, { token });
  expect(added.result.isError).toBe(false);

  const removed = await callTool('unbookmark_donor', { donorId }, { token });
  expect(removed.result.isError).toBe(false);
});
