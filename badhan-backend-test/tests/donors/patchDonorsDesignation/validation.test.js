const { HTTP_STATUS } = require('../../lib/utils/constants');
const { conflictErrorSchema } = require('../../common/schemas');
const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');
const operations = require('../../lib/operations');

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Blah Blah',
  fatherName: 'Father Blah',
  motherName: 'Mother Blah',
  studentId: 1606060,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'developer of badhan',
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

const makeDonor = async (signInResponse, overrides) => {
  const creation = await operations.createDonor(donorInfo(overrides), signInResponse);
  return creation.data.newDonor._id;
};

const expectConflict = (signInResponse, donorId, designation, message) =>
  operations.expectAuthedError(
    'patch',
    '/donors/designation',
    signInResponse,
    conflictErrorSchema(message),
    { donorId, designation }
  );

test('PATCH /donors/designation: promoting a donor (0) to super admin (3) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await expectConflict(signInResponse, donorId, 3, 'Only a volunteer can be promoted to super admin');
});

test('PATCH /donors/designation: promoting a donor (0) to hall admin (2) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await expectConflict(signInResponse, donorId, 2, 'Only a volunteer can be promoted to hall admin');
});

test('PATCH /donors/designation: demoting a hall admin directly (2 -> 1) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await operations.promoteToVolunteer(donorId, signInResponse);
  await operations.promoteToHallAdmin(donorId, signInResponse);
  await expectConflict(signInResponse, donorId, 1, 'Invalid designation transition');
});

test('PATCH /donors/designation: demoting a hall admin directly (2 -> 0) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await operations.promoteToVolunteer(donorId, signInResponse);
  await operations.promoteToHallAdmin(donorId, signInResponse);
  await expectConflict(signInResponse, donorId, 0, 'Invalid designation transition');
});

test('PATCH /donors/designation: a no-op transition (1 -> 1) is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await operations.promoteToVolunteer(donorId, signInResponse);
  await expectConflict(signInResponse, donorId, 1, 'Invalid designation transition');
});

test('PATCH /donors/designation: promoting a volunteer with no valid hall to hall admin is rejected', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo();
  const donorId = await makeDonor(signInResponse, info);
  await operations.promoteToVolunteer(donorId, signInResponse);
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
  await expectConflict(signInResponse, donorId, 2, 'Donor does not have a valid hall');
});

test('PATCH /donors/designation: out-of-range designation is rejected (400)', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await operations.expectAuthedError(
    'patch',
    '/donors/designation',
    signInResponse,
    badRequestSchema('Please input a valid designation from 0 to 3'),
    { donorId, designation: 5 }
  );
});

test('PATCH /donors/designation: non-integer designation is rejected (400)', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = await makeDonor(signInResponse);
  await operations.expectAuthedError(
    'patch',
    '/donors/designation',
    signInResponse,
    badRequestSchema('designation must be integer'),
    { donorId, designation: 'not-a-number' }
  );
});
