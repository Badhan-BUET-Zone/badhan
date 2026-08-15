const { HALLS_INDEX, HTTP_STATUS } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');
const { sameHallPermissionErrorSchema } = require('../../common/schemas');
const operations = require('../../lib/operations');

// PATCH /donors/v2 is the single write primitive for archiving — there is no batch route. Archiving
// is a donor edit, so it inherits the permission predicate the route already enforces, and it
// demotes: a volunteer or hall admin becomes a plain donor, a super admin keeps designation 3.

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
  name: 'Archive Write Path',
  fatherName: 'Archive Father',
  motherName: 'Archive Mother',
  studentId: 1606091,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'archive write path test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const patchBody = (donorId, info, archiveFlag) => ({
  donorId,
  name: info.name,
  fatherName: info.fatherName,
  motherName: info.motherName,
  phone: info.phone,
  studentId: info.studentId,
  bloodGroup: info.bloodGroup,
  hall: info.hall,
  roomNumber: info.roomNumber,
  address: info.address,
  availableToAll: info.availableToAll,
  archiveFlag,
  isCertificateEnabled: false,
  email: '',
});

const designationOf = async (donorId, signInResponse) => {
  const response = await operations.authedGet(`/donors?donorId=${donorId}`, signInResponse);
  return response.data.donor.designation;
};

const archiveFlagOf = async (donorId, signInResponse) => {
  const response = await operations.authedGet(`/donors?donorId=${donorId}`, signInResponse);
  return response.data.donor.archiveFlag;
};

test('PATCH /donors/v2: archiving demotes a volunteer and a hall admin, but not a super admin', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const volunteerInfo = donorInfo({ name: 'Archive Volunteer' });
  const volunteerId = (await operations.createDonor(volunteerInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);

  const hallAdminInfo = donorInfo({ name: 'Archive Hall Admin' });
  const hallAdminId = (await operations.createDonor(hallAdminInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(hallAdminId, signInResponse);
  await operations.promoteToHallAdmin(hallAdminId, signInResponse);

  const superAdminInfo = donorInfo({ name: 'Archive Super Admin' });
  const superAdminId = (await operations.createDonor(superAdminInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(superAdminId, signInResponse);
  await operations.promoteToSuperAdmin(superAdminId, signInResponse);

  await operations.updateDonor(patchBody(volunteerId, volunteerInfo, true), signInResponse);
  await operations.updateDonor(patchBody(hallAdminId, hallAdminInfo, true), signInResponse);
  await operations.updateDonor(patchBody(superAdminId, superAdminInfo, true), signInResponse);

  expect(await designationOf(volunteerId, signInResponse)).toEqual(0);
  expect(await designationOf(hallAdminId, signInResponse)).toEqual(0);
  // A super admin can be archived; they simply keep their designation.
  expect(await designationOf(superAdminId, signInResponse)).toEqual(3);

  expect(await archiveFlagOf(volunteerId, signInResponse)).toEqual(true);
  expect(await archiveFlagOf(superAdminId, signInResponse)).toEqual(true);

  // Unarchiving never restores a designation — demotion is one-way, re-promotion is done by hand.
  await operations.updateDonor(patchBody(volunteerId, volunteerInfo, false), signInResponse);
  expect(await archiveFlagOf(volunteerId, signInResponse)).toEqual(false);
  expect(await designationOf(volunteerId, signInResponse)).toEqual(0);

  // A donor must be at designation 0 to be deletable, and designation changes only move one step
  // at a time. Archiving already demoted the volunteer and the hall admin; the super admin kept 3.
  await operations.demoteFromSuperAdmin(superAdminId, signInResponse);
  await operations.demoteToDonor(superAdminId, signInResponse);

  await operations.deleteDonor(volunteerId, signInResponse);
  await operations.deleteDonor(hallAdminId, signInResponse);
  await operations.deleteDonor(superAdminId, signInResponse);
  await operations.signOut(signInResponse);
});

test('PATCH /donors/v2: a body omitting archiveFlag is a 400 and leaves the donor unmodified', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Archive Required Field' });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  await operations.updateDonor(patchBody(donorId, info, true), signInResponse);
  expect(await archiveFlagOf(donorId, signInResponse)).toEqual(true);

  const bodyWithoutFlag = patchBody(donorId, info, true);
  delete bodyWithoutFlag.archiveFlag;

  // A missing field must not be read as false and silently unarchive someone.
  await operations.expectAuthedError(
    'patch',
    '/donors/v2',
    signInResponse,
    badRequestSchema('archiveFlag is required'),
    bodyWithoutFlag
  );
  expect(await archiveFlagOf(donorId, signInResponse)).toEqual(true);

  await operations.expectAuthedError(
    'patch',
    '/donors/v2',
    signInResponse,
    badRequestSchema('archiveFlag must be boolean'),
    { ...patchBody(donorId, info, true), archiveFlag: 'maybe' }
  );
  expect(await archiveFlagOf(donorId, signInResponse)).toEqual(true);

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('PATCH /donors/v2: a hall admin may archive a donor of their own hall, not of another', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const hallAdminInfo = donorInfo({ name: 'Archiving Hall Admin', hall: HALLS_INDEX.CHATRI });
  const hallAdminId = (await operations.createDonor(hallAdminInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(hallAdminId, signInResponse);
  await operations.promoteToHallAdmin(hallAdminId, signInResponse);
  const hallAdminToken = (await operations.issueDonorPassword(hallAdminId, signInResponse)).data.token;

  const sameHallInfo = donorInfo({ name: 'Same Hall Target', hall: HALLS_INDEX.CHATRI });
  const sameHallId = (await operations.createDonor(sameHallInfo, signInResponse)).data.newDonor._id;

  const otherHallInfo = donorInfo({
    name: 'Other Hall Target',
    hall: HALLS_INDEX.NAZRUL,
    availableToAll: false,
  });
  const otherHallId = (await operations.createDonor(otherHallInfo, signInResponse)).data.newDonor._id;

  // Archiving carries no gate beyond edit permission — the UI never offers this to a hall admin,
  // but the API permits it for their own hall.
  const okResponse = await operations.authedPatch(
    '/donors/v2',
    patchBody(sameHallId, sameHallInfo, true),
    { data: { token: hallAdminToken } }
  );
  expect(okResponse.status).toEqual(HTTP_STATUS.OK);
  expect(await archiveFlagOf(sameHallId, signInResponse)).toEqual(true);

  // ...and the existing hall restriction is untouched.
  await operations.expectErrorWithToken(
    'patch',
    '/donors/v2',
    hallAdminToken,
    sameHallPermissionErrorSchema,
    patchBody(otherHallId, otherHallInfo, true)
  );
  expect(await archiveFlagOf(otherHallId, signInResponse)).toEqual(false);

  // The acting hall admin is still at designation 2, and a donor must be at 0 to be deletable. The
  // designation route never demotes a hall admin directly — that only happens as a side effect of
  // promoting someone else in the same hall — so archiving is the way down, which is the very
  // demotion the first test in this file pins.
  await operations.updateDonor(patchBody(hallAdminId, hallAdminInfo, true), signInResponse);
  await operations.deleteDonor(hallAdminId, signInResponse);
  await operations.deleteDonor(sameHallId, signInResponse);
  await operations.deleteDonor(otherHallId, signInResponse);
  await operations.signOut(signInResponse);
});

test('PATCH /donors/v2 and GET /donors: no request ceiling, so an archive sweep cannot 429', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Archive Sweep Target' });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  // commonLimiter allowed 12 requests per minute, which the client-side archive loop (one GET plus
  // one PATCH per donor) would blow through on its sixth donor. 30 sequential calls of each is what
  // catches someone re-adding the limiter.
  for (let i = 0; i < 30; i++) {
    const getResponse = await operations.authedGet(`/donors?donorId=${donorId}`, signInResponse);
    expect(getResponse.status).toEqual(HTTP_STATUS.OK);
  }
  for (let i = 0; i < 30; i++) {
    const patchResponse = await operations.updateDonor(
      patchBody(donorId, info, i % 2 === 0),
      signInResponse
    );
    expect(patchResponse.status).toEqual(HTTP_STATUS.OK);
  }

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});
