const { HALLS_INDEX, HTTP_STATUS } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');
const operations = require('../../lib/operations');

// archiveFlag is a required query param on GET /search/v3 with no server-side default and no
// fallback. It always partitions the search: false is the live roster, true is the archive. There
// is no "show both" mode, and the route takes the value at face value for every caller regardless
// of designation.

const badRequestSchema = (message) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: message },
  },
  required: ['status', 'statusCode', 'message'],
});

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Archive Partition Donor',
  fatherName: 'Archive Partition Donor Father',
  motherName: 'Archive Partition Donor Mother',
  studentId: 1606090,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'archive partition test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const searchUrl = (studentId, overrides = '') =>
  `/search/v3?bloodGroup=2&hall=${HALLS_INDEX.SUHRAWARDY}&batch=${String(studentId).substring(0, 2)}` +
  `&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=true${overrides}`;

test('GET/search/v3: archiveFlag partitions the search', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo();
  const creation = await operations.createDonor(info, signInResponse);
  const donorId = creation.data.newDonor._id;

  const searchArgs = {
    bloodGroup: info.bloodGroup,
    hall: info.hall,
    batch: String(info.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    signInResponse,
  };

  // A freshly created donor is not archived, so it belongs to the archiveFlag=false partition...
  await operations.searchDonors({
    ...searchArgs,
    archiveFlag: false,
    expectedTotalItems: 1,
    expectedDonorIds: [donorId],
  });

  // ...and is absent from the archive partition. This is the assertion that fails if the predicate
  // is dropped instead of applied: without it the same donor would come back for both values.
  await operations.searchDonors({
    ...searchArgs,
    archiveFlag: true,
    expectedTotalItems: 0,
    expectedDonorIds: [],
  });

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/search/v3: archiveFlag is mandatory — missing, empty and non-boolean all 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const studentId = 1606090;

  // Asserting 400 rather than "returns non-archived donors" is the point: a regression that
  // defaults the param would otherwise pass unnoticed.
  await operations.expectAuthedError(
    'get',
    searchUrl(studentId),
    signInResponse,
    badRequestSchema('archiveFlag is required')
  );

  await operations.expectAuthedError(
    'get',
    searchUrl(studentId, '&archiveFlag='),
    signInResponse,
    badRequestSchema('archiveFlag must be boolean')
  );

  await operations.expectAuthedError(
    'get',
    searchUrl(studentId, '&archiveFlag=maybe'),
    signInResponse,
    badRequestSchema('archiveFlag must be boolean')
  );

  // There is no `archived` alias anywhere — the identifier is archiveFlag end to end.
  await operations.expectAuthedError(
    'get',
    searchUrl(studentId, '&archived=true'),
    signInResponse,
    badRequestSchema('archiveFlag is required')
  );

  await operations.signOut(signInResponse);
});

test('GET/search/v3: the response omits email', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Archive Email Donor' });
  const creation = await operations.createDonor(info, signInResponse);
  const donorId = creation.data.newDonor._id;

  const response = await operations.searchDonors({
    bloodGroup: info.bloodGroup,
    hall: info.hall,
    batch: String(info.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    archiveFlag: false,
    signInResponse,
    expectedTotalItems: 1,
    expectedDonorIds: [donorId],
  });

  // Unchanged behaviour, but load-bearing from here on: the batch archive loop has to fetch each
  // donor before patching it precisely because email is not in the search projection.
  response.data.filteredDonors.forEach((donor) => {
    expect(donor.email).toBeUndefined();
  });

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/search/v3: a volunteer may request archiveFlag=true — no 403, no coercion', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Archive Volunteer Requester' });
  const creation = await operations.createDonor(info, signInResponse);
  const volunteerId = creation.data.newDonor._id;

  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerToken = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Deliberately pinning the permissive behaviour: the gate on who may browse the archive lives
  // entirely in the Vue layer, and the backend has no notion of the archive-search setting at all.
  // A later reader "fixing" the missing designation check here would silently break the frontend.
  const response = await operations.searchDonors({
    bloodGroup: info.bloodGroup,
    hall: info.hall,
    batch: String(info.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    archiveFlag: true,
    signInResponse: volunteerToken,
    expectedTotalItems: 0,
    expectedDonorIds: [],
  });
  expect(response.status).toEqual(HTTP_STATUS.OK);

  await operations.deleteDonor(volunteerId, signInResponse);
  await operations.signOut(signInResponse);
});
