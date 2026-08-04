const operations = require('../../lib/operations');
const { allDonorSchema } = require('../schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');

// GET /donors/all is the second and last route that partitions on archiveFlag. Unlike /search/v3
// the motivation is not cost: an unpartitioned list of every donor is exactly where an archived
// donor would be mistaken for an active one. Despite the name it inherited, this route never
// filtered on designation and still does not.

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'All Donors Row',
  studentId: 1606095,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'all donors test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const archive = (donorId, info, signInResponse) =>
  operations.updateDonor(
    {
      donorId,
      name: info.name,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: info.hall,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      archiveFlag: true,
      email: '',
    },
    signInResponse
  );

test('GET/donors/all: partitions on archiveFlag and lists plain donors as well as members', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const plainInfo = donorInfo({ name: 'All Donors Plain Donor' });
  const plainId = (await operations.createDonor(plainInfo, signInResponse)).data.newDonor._id;

  const volunteerInfo = donorInfo({ name: 'All Donors Volunteer' });
  const volunteerId = (await operations.createDonor(volunteerInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);

  const archivedInfo = donorInfo({ name: 'All Donors Archived' });
  const archivedId = (await operations.createDonor(archivedInfo, signInResponse)).data.newDonor._id;
  await archive(archivedId, archivedInfo, signInResponse);

  const response = await operations.authedGet('/donors/all?archiveFlag=false', signInResponse, allDonorSchema);
  const ids = response.data.data.map((donor) => donor._id);

  // The designation-0 donor is the positive assertion that this list was never filtered on
  // designation, which is what its old name claimed.
  expect(ids).toContain(plainId);
  expect(ids).toContain(volunteerId);
  expect(ids).not.toContain(archivedId);
  // pins the inclusion projection: without archiveFlag named there, every row reads undefined
  response.data.data.forEach((donor) => {
    expect(donor.archiveFlag).toEqual(false);
  });

  const archivedResponse = await operations.authedGet('/donors/all?archiveFlag=true', signInResponse, allDonorSchema);
  const archivedIds = archivedResponse.data.data.map((donor) => donor._id);
  expect(archivedIds).toContain(archivedId);
  expect(archivedIds).not.toContain(plainId);
  expect(archivedIds).not.toContain(volunteerId);
  archivedResponse.data.data.forEach((donor) => {
    expect(donor.archiveFlag).toEqual(true);
  });

  await operations.deleteDonor(plainId, signInResponse);
  await operations.deleteDonor(archivedId, signInResponse);
  await operations.signOut(signInResponse);
});
