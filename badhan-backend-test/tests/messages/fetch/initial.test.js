const operations = require('../../lib/operations');
const { getMessagesSchema } = require('../schemas');
const { createVolunteer, fetchMessages, seedMessages, sendMessage, expectStatus } = require('../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// GET /messages with no cursor — the first-open read.

test('GET/messages: requires a session', async () => {
  await expectStatus(() => operations.guestGet('/messages'), 401);
});

test('GET/messages: with no cursor, returns the newest page oldest-first', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 35);

  const response = await fetchMessages(token, '', getMessagesSchema);
  const { messages, hasMore } = response.data;

  // 30 is the default page, not 35.
  expect(messages.length).toBe(30);
  // The NEWEST 30, so the oldest five are the ones missing.
  expect(messages[0].text).toBe('m5');
  expect(messages[29].text).toBe('m34');
  // Oldest-first in every mode, so the frontend never reverses an array.
  const dates = messages.map((m) => m.date);
  expect([...dates].sort((a, b) => a - b)).toEqual(dates);
  // More history exists behind this page.
  expect(hasMore).toBe(true);
});

test('GET/messages: hasMore is false when the whole room fits on one page', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await seedMessages(token, 3);

  const response = await fetchMessages(token, '', getMessagesSchema);
  expect(response.data.messages.length).toBe(3);
  expect(response.data.hasMore).toBe(false);
});

test('GET/messages: an empty room is an empty array, not an error', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);

  const response = await fetchMessages(token, '', getMessagesSchema);
  expect(response.data.messages).toEqual([]);
  expect(response.data.hasMore).toBe(false);
  expect(typeof response.data.serverTime).toBe('number');
});

test('GET/messages: every row carries its sender, joined live from the donor record', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorInfo } = await createVolunteer(signInResponse);
  await sendMessage(token, 'joined please');

  const response = await fetchMessages(token, '', getMessagesSchema);
  const row = response.data.messages[0];

  expect(row.sender).not.toBeNull();
  expect(row.sender.name).toBe(donorInfo.name);
  expect(row.sender.studentId).toBe(donorInfo.studentId);
  expect(row.sender.hall).toBe(donorInfo.hall);
  // Volunteer, and it is read from the record rather than snapshotted onto the message.
  expect(row.sender.designation).toBe(1);
});

test('GET/messages: a sender promoted after sending shows their CURRENT rank', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorId } = await createVolunteer(signInResponse);
  await sendMessage(token, 'sent as a volunteer');

  const before = await fetchMessages(token, '', getMessagesSchema);
  expect(before.data.messages[0].sender.designation).toBe(1);

  await operations.promoteToHallAdmin(donorId, signInResponse);

  // The join is live and applied literally, with no special case. This is the whole reason
  // nothing about the sender is stored on the message row.
  const after = await fetchMessages(token, '', getMessagesSchema);
  expect(after.data.messages[0].sender.designation).toBe(2);
});

test('GET/messages: a renamed sender is renamed on every message they ever sent', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorId, donorInfo } = await createVolunteer(signInResponse);
  await seedMessages(token, 3);

  await operations.updateDonor(
    {
      donorId,
      name: 'Renamed Member',
      fatherName: donorInfo.fatherName,
      motherName: donorInfo.motherName,
      phone: donorInfo.phone,
      studentId: donorInfo.studentId,
      bloodGroup: donorInfo.bloodGroup,
      hall: donorInfo.hall,
      roomNumber: donorInfo.roomNumber,
      address: donorInfo.address,
      availableToAll: donorInfo.availableToAll,
      archiveFlag: false,
      isCertificateEnabled: false,
      email: '',
    },
    signInResponse
  );

  const response = await fetchMessages(token, '', getMessagesSchema);
  expect(response.data.messages.length).toBe(3);
  response.data.messages.forEach((m) => expect(m.sender.name).toBe('Renamed Member'));
});

test('GET/messages: the sender projection leaks no credential or contact field', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token } = await createVolunteer(signInResponse);
  await sendMessage(token, 'no leaks');

  const response = await fetchMessages(token, '', getMessagesSchema);
  const row = response.data.messages[0];

  // Absent because the projection is by INCLUSION and nobody named them — not because
  // somebody remembered to exclude them.
  expect(row.sender.password).toBeUndefined();
  expect(row.sender.email).toBeUndefined();
  expect(row.sender.address).toBeUndefined();
  // phone is absent DELIBERATELY: the chat is not a directory.
  expect(row.sender.phone).toBeUndefined();

  // And the same claim over the whole body, so a future field cannot slip in under a key
  // nobody thought to assert on.
  const body = JSON.stringify(response.data);
  expect(body).not.toMatch(/password|email|address/i);
});

test('GET/messages: the room is global — a member of another hall sees the same messages', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const chatri = await createVolunteer(signInResponse, { hall: HALLS_INDEX.CHATRI });
  const titumir = await createVolunteer(signInResponse, { hall: HALLS_INDEX.TITUMIR });

  await sendMessage(chatri.token, 'from chatri');
  await sendMessage(titumir.token, 'from titumir');

  const chatriView = await fetchMessages(chatri.token, '', getMessagesSchema);
  const titumirView = await fetchMessages(titumir.token, '', getMessagesSchema);

  // Byte-identical but for the watermark. This is the first collection in the codebase where
  // that is true, and it is the feature rather than an oversight.
  expect(chatriView.data.messages).toEqual(titumirView.data.messages);
  expect(chatriView.data.messages.map((m) => m.text)).toEqual(['from chatri', 'from titumir']);
});

test('GET/messages: a message outlives its sender and reports sender null', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { token, donorId } = await createVolunteer(signInResponse);
  await sendMessage(token, 'sender about to be deleted');

  const reader = await createVolunteer(signInResponse);
  await operations.deleteDonor(donorId, signInResponse);

  const response = await fetchMessages(reader.token, '', getMessagesSchema);
  const row = response.data.messages.find((m) => m.text === 'sender about to be deleted');

  // A real, expected state and not an error. The frontend renders it as a former member.
  expect(row).toBeDefined();
  expect(row.sender).toBeNull();
});
