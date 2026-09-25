const axios = require('axios');
const operations = require('../lib/operations');
const flows = require('../lib/flows');
const { uniquePhone } = require('../helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

// Everything the message suites need to put members and messages in the room, in one place.
//
// The database is purged before EVERY test (setup-after-env.js), so nothing here is shared
// state between tests — each test builds the members and the history it needs from scratch.

let studentIdCounter = 0;

function uniqueStudentId() {
  studentIdCounter += 1;
  // Batch 19, department 05, then a counter. Valid under validateBODYStudentId's checks.
  return `1905${String(studentIdCounter % 1000).padStart(3, '0')}`;
}

function buildDonorInfo(overrides = {}) {
  return {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Message Suite Member',
    fatherName: 'Message Suite Member Father',
    motherName: 'Message Suite Member Mother',
    studentId: uniqueStudentId(),
    address: 'Test Address',
    roomNumber: '1003',
    comment: 'message suite',
    extraDonationCount: 0,
    availableToAll: false,
    ...overrides,
  };
}

// A token belongs to a DESIGNATION, and every rule in this feature is keyed on one, so the
// helpers are named after the rank rather than after the person.

async function createVolunteer(signInResponse, overrides = {}) {
  const donorInfo = buildDonorInfo(overrides);
  const { donorId, volunteerToken } = await flows.createVolunteerWithToken(donorInfo, signInResponse);
  return { donorId, token: volunteerToken, donorInfo };
}

async function createHallAdmin(signInResponse, overrides = {}) {
  const donorInfo = buildDonorInfo(overrides);
  const { donorId, volunteerToken } = await flows.createVolunteerWithToken(donorInfo, signInResponse, {
    alsoPromoteHallAdmin: true,
  });
  return { donorId, token: volunteerToken, donorInfo };
}

/**
 * A member demoted back to Donor who is STILL HOLDING THE TOKEN they were issued as a
 * volunteer. This is not a contrived case: DonorsController rewrites the designation in place
 * and revokes nothing, so this is exactly the state a demoted member is in until their token
 * expires — and it is the whole reason handleVolunteerCheck exists.
 */
async function createDemotedMemberHoldingToken(signInResponse, overrides = {}) {
  const donorInfo = buildDonorInfo(overrides);
  const { donorId, volunteerToken } = await flows.createVolunteerWithToken(donorInfo, signInResponse);
  await operations.demoteToDonor(donorId, signInResponse);
  return { donorId, token: volunteerToken, donorInfo };
}

// --- the three routes, driven by a raw token rather than a signInResponse ---------------
// flows hands back a token string, so these wrap it in the { data: { token } } shape the
// http helpers expect rather than making every test do it.

const asSignIn = (token) => ({ data: { token } });

async function sendMessage(token, text, schema) {
  return operations.authedPost('/messages', { text }, asSignIn(token), schema);
}

async function fetchMessages(token, query = '', schema) {
  return operations.authedGet(`/messages${query}`, asSignIn(token), schema);
}

async function deleteMessage(token, messageId, schema) {
  return operations.authedDelete(`/messages?messageId=${messageId}`, asSignIn(token), schema);
}

/**
 * Put `count` messages in the room, in order, and hand back the response bodies.
 *
 * Sequential on purpose. The cursor's whole job is to order messages, and firing these in
 * parallel would leave the expected order up to whichever insert won — which is the bug these
 * suites are looking for, not the harness's to introduce.
 */
async function seedMessages(token, count, prefix = 'm') {
  const sent = [];
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sendMessage(token, `${prefix}${i}`);
    sent.push(response.data.sentMessage);
  }
  return sent;
}

// The seed fixture sits beside the purge route on the internal server, which is already how these
// suites reset the database (setup-after-env.js), so its address is derived from that one setting
// rather than configured a second time.
const SEED_MESSAGES_URL = (process.env.BACKUP_PURGE_URL || 'http://localhost:4000/purge-local-db')
  .replace(/\/purge-local-db$/, '/seed/messages');

/**
 * Put `count` messages in the room, of which the last `sharedCount` SHARE ONE MILLISECOND.
 *
 * The shared rows are inserted by the internal server with an explicit date, because this case
 * cannot be produced through the API: a message's `date` is the server's own schema default, so
 * two sends collide only when the machine happens to construct both inside one millisecond.
 *
 * That used to be reliable and stopped being so. A burst of twelve, then of ninety-six — 564
 * sends in all — measured a closest pair of a flat 1ms, because each send now costs the server
 * more than a millisecond of its own work before the document is constructed. Concurrency cannot
 * compress that, so the collision was no longer something to wait for, and these suites were
 * failing for the weather rather than for the cursor they guard.
 *
 * WHAT DID NOT CHANGE: every message before the shared rows is still sent through the real API,
 * in order, and every assertion in these suites still pages through the real API and still
 * demands that a cursor never splits a millisecond. Only the precondition is stated instead of
 * hoped for. Do not relax this into a skip, and do not "simplify" it back into a burst.
 *
 * Returns the whole room, oldest-first, plus the timestamp that is shared.
 */
async function seedMessagesWithSharedMillisecond(token, count = 12, sharedCount = 2) {
  const sent = await seedMessages(token, count - sharedCount, 'm');
  const last = sent[sent.length - 1];

  // One millisecond past the last real send, so the shared rows land at the end of the room in
  // the same place a real collision would have put them.
  const sharedDate = last.date + 1;

  const response = await axios.post(SEED_MESSAGES_URL, {
    senderId: last.sender._id,
    texts: Array.from({ length: sharedCount }, (_, i) => `shared-${i}`),
    date: sharedDate,
  });

  const shared = response.data.messages;
  if (!Array.isArray(shared) || shared.length !== sharedCount) {
    throw new Error(
      `The internal seed fixture returned ${Array.isArray(shared) ? shared.length : 'no'} rows, ` +
        `expected ${sharedCount}. Without them these suites verify nothing.`
    );
  }

  // The order the cursor itself uses: by date, then by id within a shared millisecond.
  const messages = [...sent, ...shared].sort((a, b) => a.date - b.date || (a._id < b._id ? -1 : 1));

  return { messages, sharedDate, sharedCount };
}

// badhanAxios rejects on any non-2xx, so an expected failure has to be caught.
async function expectStatus(request, expectedStatus) {
  try {
    await request();
  } catch (e) {
    expect(e.response.status).toBe(expectedStatus);
    return e.response;
  }
  throw new Error(`Expected the request to fail with ${expectedStatus} but it succeeded`);
}

module.exports = {
  buildDonorInfo,
  uniqueStudentId,
  createVolunteer,
  createHallAdmin,
  createDemotedMemberHoldingToken,
  sendMessage,
  fetchMessages,
  deleteMessage,
  seedMessages,
  seedMessagesWithSharedMillisecond,
  expectStatus,
};
