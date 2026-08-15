// (Unknown) is a legacy value: no write may produce it, and every record that already holds it
// stays usable. These tests are the specification of that split — the "still allowed" ones matter
// as much as the refusals, because the whole plan rests on not migrating the database.

const { HTTP_STATUS, HALLS_INDEX } = require('../../lib/utils/constants');
const { conflictErrorSchema } = require('../../common/schemas');
const { uniquePhone } = require('../../helpers');
const operations = require('../../lib/operations');
const { patchCommentSchema, searchSchema } = require('../schemas');

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Unknown Hall Suite',
  fatherName: 'Unknown Hall Suite Father',
  motherName: 'Unknown Hall Suite Mother',
  studentId: 1606060,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'unknown hall suite',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

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

// The only way to get an (Unknown) donor now: create with a real hall, then edit the hall away.
// That is not a workaround for the tests — it is the shape of every such record in production,
// which was written before the creation rule existed.
const makeUnknownHallDonor = async (signInResponse, overrides = {}) => {
  const info = donorInfo(overrides);
  const creation = await operations.createDonor(info, signInResponse);
  const donorId = creation.data.newDonor._id;
  await operations.updateDonor(
    {
      donorId,
      name: info.name,
      fatherName: info.fatherName,
      motherName: info.motherName,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: HALLS_INDEX.UNKNOWN,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      email: '',
    },
    signInResponse
  );
  return { donorId, info };
};

test('POST /donors: creating a donor with (Unknown) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.expectAuthedError(
    'post',
    '/donors',
    signInResponse,
    badRequestSchema('Please input an allowed hall number'),
    donorInfo({ hall: HALLS_INDEX.UNKNOWN })
  );
});

test('POST /donors: Attached is still rejected too', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.expectAuthedError(
    'post',
    '/donors',
    signInResponse,
    badRequestSchema('Please input an allowed hall number'),
    donorInfo({ hall: HALLS_INDEX.ATTACHED })
  );
});

test('PATCH /donors: an existing donor may still be moved to (Unknown)', async () => {
  // The guarantee the whole plan rests on. makeUnknownHallDonor does the edit and the response is
  // schema-validated inside updateDonor, so reaching this line at all is the assertion.
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId } = await makeUnknownHallDonor(signInResponse);
  const fetched = await operations.getDonor(donorId, signInResponse);
  expect(fetched.data.donor.hall).toBe(HALLS_INDEX.UNKNOWN);
});

test('PATCH /donors: an (Unknown) donor can be archived', async () => {
  // The bulk archive sweep re-sends each donor's own hall, so an (Unknown) donor that could not be
  // archived would halt it on the way past.
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId, info } = await makeUnknownHallDonor(signInResponse);

  await operations.updateDonor(
    {
      donorId,
      name: info.name,
      fatherName: info.fatherName,
      motherName: info.motherName,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: HALLS_INDEX.UNKNOWN,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      email: '',
      archiveFlag: true,
      isCertificateEnabled: false,
    },
    signInResponse
  );

  const fetched = await operations.getDonor(donorId, signInResponse);
  expect(fetched.data.donor.archiveFlag).toBe(true);
  expect(fetched.data.donor.hall).toBe(HALLS_INDEX.UNKNOWN);
});

test('PATCH /donors: an (Unknown) donor can be repaired by setting a real hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId, info } = await makeUnknownHallDonor(signInResponse);

  await operations.updateDonor(
    {
      donorId,
      name: info.name,
      fatherName: info.fatherName,
      motherName: info.motherName,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: HALLS_INDEX.TITUMIR,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      email: '',
    },
    signInResponse
  );

  const fetched = await operations.getDonor(donorId, signInResponse);
  expect(fetched.data.donor.hall).toBe(HALLS_INDEX.TITUMIR);
});

test('PATCH /donors/comment: rejected on an (Unknown) donor', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId } = await makeUnknownHallDonor(signInResponse);

  await operations.expectAuthedError(
    'patch',
    '/donors/comment',
    signInResponse,
    conflictErrorSchema('Donor does not have a valid hall'),
    { donorId, comment: 'should not land' }
  );
});

test('PATCH /donors/comment: works again once the hall is set', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId, info } = await makeUnknownHallDonor(signInResponse);

  await operations.updateDonor(
    {
      donorId,
      name: info.name,
      fatherName: info.fatherName,
      motherName: info.motherName,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: HALLS_INDEX.RASHID,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      email: '',
    },
    signInResponse
  );

  await operations.patchDonorComment(donorId, 'now allowed', signInResponse, patchCommentSchema);
});

test('GET /search/v3: (Unknown) donors are still findable', async () => {
  // Search takes the wider set on purpose. Narrowing it would hide exactly the records the plan
  // promised to leave alone. Asserted as a containment rather than an exact id list: other suites
  // in this run may leave (Unknown) donors behind, and this is about hall=8 being an accepted
  // query value at all.
  const signInResponse = await operations.signInSuperAdmin();
  const { donorId, info } = await makeUnknownHallDonor(signInResponse);

  const url = `/search/v3?bloodGroup=${info.bloodGroup}&hall=${HALLS_INDEX.UNKNOWN}`
    + '&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=true&archiveFlag=false';
  const response = await operations.authedGet(url, signInResponse, searchSchema());

  expect(response.data.filteredDonors.map((d) => d._id)).toContain(donorId);
});
