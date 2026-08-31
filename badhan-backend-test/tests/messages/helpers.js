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

/**
 * Put `count` messages in the room such that AT LEAST TWO SHARE A MILLISECOND.
 *
 * This exists because the sequential seeder cannot produce the case these suites most need to
 * cover. Sends through the local stack land about 3ms apart, so a sequential seed never
 * collides — and a "same millisecond" test written on top of one asserts an invariant it never
 * actually exercises, passing forever while the bug it was written for sits in the cursor.
 *
 * A parallel burst does collide, reliably but not certainly, so this retries until it sees a
 * collision and fails loudly rather than quietly degrading into the vacuous test it replaced.
 *
 * Returns the whole room, oldest-first, plus the timestamp that is shared.
 */
async function seedBurstWithSharedMillisecond(token, count = 12, attempts = 6) {
  // Accumulated across attempts, not replaced. A retry cannot take back the messages the
  // previous burst already put in the room, so what is returned has to be the WHOLE room —
  // a caller that walks the history would otherwise see rows this helper never told it about.
  const messages = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const sent = await Promise.all(
      Array.from({ length: count }, (_, i) => sendMessage(token, `b${attempt}-${i}`))
    );
    messages.push(...sent.map((response) => response.data.sentMessage));
    messages.sort((a, b) => a.date - b.date || (a._id < b._id ? -1 : 1));

    const byDate = new Map();
    messages.forEach((m) => byDate.set(m.date, (byDate.get(m.date) || 0) + 1));
    const sharedDate = [...byDate.entries()].find(([, n]) => n > 1);
    if (sharedDate) {
      return { messages, sharedDate: sharedDate[0], sharedCount: sharedDate[1] };
    }
  }
  throw new Error(
    `Could not produce two messages sharing a millisecond in ${attempts} bursts of ${count}. ` +
      'The same-millisecond suites cannot verify anything without one — do not relax this into a skip.'
  );
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
  seedBurstWithSharedMillisecond,
  expectStatus,
};
