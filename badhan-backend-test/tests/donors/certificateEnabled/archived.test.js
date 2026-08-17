const operations = require('../../lib/operations');
const { certificateEnabledDonorSchema } = require('../schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');

// Archiving and isCertificateEnabled are independent: nothing in the archive path touches the flag,
// so an archived donor whose certificate was enabled still has one that verifies. This route
// therefore does NOT partition on archiveFlag the way /donors/all does — hiding those rows would
// hide exactly the ones worth auditing.

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Certificate Archived Row',
  fatherName: 'Certificate Archived Row Father',
  motherName: 'Certificate Archived Row Mother',
  studentId: 1606095,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'certificate archived test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const setFlags = (donorId, info, { isCertificateEnabled, archiveFlag }, signInResponse) =>
  operations.updateDonor(
    {
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
      isCertificateEnabled,
      email: '',
    },
    signInResponse
  );

test('GET/donors/certificateEnabled: an archived donor with the flag on is listed, and marked archived', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const archivedInfo = donorInfo({ name: 'Certificate Enabled Archived Donor' });
  const archivedId = (await operations.createDonor(archivedInfo, signInResponse)).data.newDonor._id;
  await setFlags(archivedId, archivedInfo, { isCertificateEnabled: true, archiveFlag: true }, signInResponse);

  const liveInfo = donorInfo({ name: 'Certificate Enabled Live Donor' });
  const liveId = (await operations.createDonor(liveInfo, signInResponse)).data.newDonor._id;
  await setFlags(liveId, liveInfo, { isCertificateEnabled: true, archiveFlag: false }, signInResponse);

  const response = await operations.authedGet(
    '/donors/certificateEnabled',
    signInResponse,
    certificateEnabledDonorSchema
  );
  const rows = response.data.data;
  const ids = rows.map((donor) => donor._id);

  expect(ids).toContain(archivedId);
  expect(ids).toContain(liveId);

  // The projection assertion. archiveFlag must be named in the inclusion projection or every row
  // comes back with it undefined, the page renders no archived marker, and nothing else fails.
  expect(rows.find((donor) => donor._id === archivedId).archiveFlag).toEqual(true);
  expect(rows.find((donor) => donor._id === liveId).archiveFlag).toEqual(false);

  await operations.deleteDonor(archivedId, signInResponse);
  await operations.deleteDonor(liveId, signInResponse);
  await operations.signOut(signInResponse);
});
