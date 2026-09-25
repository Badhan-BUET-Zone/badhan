const operations = require('../lib/operations');
const { uniquePhone } = require('../helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

// Everything the feedback suites need to build a donor and get a registration token, in one place.
// Tokens are always minted through the real route rather than forged, so no suite here takes a
// shortcut around a rule the feature actually enforces.
//
// NOT TESTED HERE, and deliberately: the `expired` branch of verifyFeedbackToken. No route can
// mint an expiring token any more, and forging one would need this project to hold JWT_SECRET,
// which it does not and should not — every suite here is a black-box API client. That branch is
// covered by the comment in services/feedbackToken.ts and by the codes already in the wild.

let studentIdCounter = 0;

function uniqueStudentId() {
  studentIdCounter += 1;
  // Batch 19, department 05, then a counter. Valid under validateBODYStudentId's department and
  // batch checks.
  return `1905${String(studentIdCounter % 1000).padStart(3, '0')}`;
}

function buildDonorInfo(overrides = {}) {
  return {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Feedback Suite Donor',
    fatherName: 'Feedback Suite Donor Father',
    motherName: 'Feedback Suite Donor Mother',
    studentId: uniqueStudentId(),
    address: 'Test Address',
    roomNumber: '1003',
    comment: 'feedback suite',
    extraDonationCount: 0,
    availableToAll: false,
    ...overrides,
  };
}

// The payload shape the registration page sends: exactly NewPersonCard's keysExpected, minus `key`.
function buildNewDonorPayload(overrides = {}) {
  return {
    name: 'New Donor Submission',
    phone: uniquePhone(),
    studentId: uniqueStudentId(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    address: 'Palashi',
    roomNumber: '404',
    comment: 'registration payload',
    donationCount: 0,
    lastDonation: null,
    plateletDonationCount: 0,
    lastPlateletDonation: null,
    availableToAll: false,
    ...overrides,
  };
}

// The only way to get a token now: an authenticated call stating a hall. `hall` may be HALL_ANY
// for an "All Halls" code. There is no anonymous mint and no unauthenticated one — a message needs
// no token at all.
async function mintRegistrationToken(hall, signInResponse) {
  const response = await operations.authedPost(
    '/feedbacks/registrationToken',
    { hall },
    signInResponse
  );
  return response.data.token;
}

function decodeJwtPayload(token) {
  // Plain base64 rather than a verify: a JWT payload is public, and reading it the way anyone
  // holding the token could is the point of the claim-set assertions.
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

// badhanAxios rejects on any non-2xx, so an expected failure has to be caught. Mirrors
// expectErrorWithToken in lib/http.js, for the routes that take no session at all.
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
  expectStatus,
  buildDonorInfo,
  buildNewDonorPayload,
  uniqueStudentId,
  mintRegistrationToken,
  decodeJwtPayload,
};
