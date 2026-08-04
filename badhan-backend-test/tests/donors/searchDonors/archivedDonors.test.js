const { HALLS_INDEX } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');
const { activeDonorSearchResultSchema } = require('../../activeDonors/schemas');
const operations = require('../../lib/operations');

// What archiving does and does not reach. Exactly two routes partition on archiveFlag — GET
// /search/v3 (here) and the super-admin all-donors table (added later). Everything else keeps
// returning archived donors exactly as before: archiving flips one boolean, it does not cascade.
//
// These assertions live with the write path because PATCH /donors/v2 is the only way to produce an
// archived donor, and the suite has no direct database access.

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Archived Donor',
  studentId: 1606092,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'archived donor test',
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

test('GET/search/v3: an archived donor leaves the live roster and appears only in the archive', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const liveInfo = donorInfo({ name: 'Still Live Donor' });
  const liveId = (await operations.createDonor(liveInfo, signInResponse)).data.newDonor._id;

  const archivedInfo = donorInfo({ name: 'Now Archived Donor' });
  const archivedId = (await operations.createDonor(archivedInfo, signInResponse)).data.newDonor._id;
  await archive(archivedId, archivedInfo, signInResponse);

  const searchArgs = {
    bloodGroup: liveInfo.bloodGroup,
    hall: liveInfo.hall,
    batch: String(liveInfo.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    signInResponse,
  };

  // The core regression test: archiveFlag=false excludes archived donors.
  await operations.searchDonors({
    ...searchArgs,
    archiveFlag: false,
    expectedTotalItems: 1,
    expectedDonorIds: [liveId],
  });

  // ...and archiveFlag=true returns only archived donors.
  await operations.searchDonors({
    ...searchArgs,
    archiveFlag: true,
    expectedTotalItems: 1,
    expectedDonorIds: [archivedId],
  });

  await operations.deleteDonor(liveId, signInResponse);
  await operations.deleteDonor(archivedId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/search/v3: a volunteer asking for archiveFlag=true gets the archive back', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const archivedInfo = donorInfo({ name: 'Volunteer Visible Archived' });
  const archivedId = (await operations.createDonor(archivedInfo, signInResponse)).data.newDonor._id;
  await archive(archivedId, archivedInfo, signInResponse);

  const volunteerInfo = donorInfo({ name: 'Archive Reading Volunteer' });
  const volunteerId = (await operations.createDonor(volunteerInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerToken = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Deliberately pinning the permissive read: the restriction on who browses the archive lives
  // entirely in the Vue layer, and the audit log is what keeps "who read the archive" answerable.
  // A later reader "fixing" this into a designation check would break the frontend silently.
  await operations.searchDonors({
    bloodGroup: archivedInfo.bloodGroup,
    hall: archivedInfo.hall,
    batch: String(archivedInfo.studentId).substring(0, 2),
    name: 'Volunteer Visible Archived',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    archiveFlag: true,
    signInResponse: volunteerToken,
    expectedTotalItems: 1,
    expectedDonorIds: [archivedId],
  });

  // A donor must be at designation 0 to be deletable.
  await operations.demoteToDonor(volunteerId, signInResponse);
  await operations.deleteDonor(archivedId, signInResponse);
  await operations.deleteDonor(volunteerId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/activeDonors: an archived donor still appears, carrying archiveFlag: true', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const info = donorInfo({ name: 'Archived Active Donor' });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;
  await operations.markDonorAsActive(donorId, signInResponse);
  await archive(donorId, info, signInResponse);

  // Archiving does not cascade: the activedonors row is not deleted and this list takes no
  // archiveFlag param. It also catches the undefined-to-null serialization trap in the shared query
  // builder, which would empty this list for everyone.
  const response = await operations.authedGet(
    `/activeDonors?bloodGroup=-1&hall=${info.hall}&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=false&markedByMe=false&availableToAllOrHall=false`,
    signInResponse,
    activeDonorSearchResultSchema
  );

  const row = response.data.activeDonors.find((donor) => donor._id === donorId);
  expect(row).toBeDefined();
  // The field's presence is the assertion the card chip depends on — the active-donors pipeline is
  // an inclusion projection, so a dropped line would read as "not archived" rather than fail.
  expect(row.archiveFlag).toEqual(true);

  await operations.authedDelete(`/activeDonors/${donorId}`, signInResponse);
  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/donors/checkDuplicate and GET/donors/designation still see archived donors', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);

  const duplicateInfo = donorInfo({ name: 'Archived Duplicate Source' });
  const duplicateId = (await operations.createDonor(duplicateInfo, signInResponse)).data.newDonor._id;
  await archive(duplicateId, duplicateInfo, signInResponse);

  // If duplicate detection skipped archived donors, creating a donor would fail with "phone already
  // exists" against a record nobody could find.
  const duplicateResponse = await operations.checkDuplicate(duplicateInfo.phone, signInResponse);
  expect(duplicateResponse.data.found).toEqual(true);
  expect(duplicateResponse.data.donor._id).toEqual(duplicateId);

  // The hall-scoped members list is not partitioned either. Archiving a super admin keeps their
  // designation, so this asserts the list rather than the demotion.
  const memberInfo = donorInfo({ name: 'Archived Super Admin Member', hall: me.data.donor.hall });
  const memberId = (await operations.createDonor(memberInfo, signInResponse)).data.newDonor._id;
  await operations.promoteToVolunteer(memberId, signInResponse);
  await operations.promoteToSuperAdmin(memberId, signInResponse);
  await archive(memberId, memberInfo, signInResponse);

  // Schema-less on purpose: the shared designationSchema requires every list to be non-empty, and
  // this hall need not have a volunteer or a hall admin for the assertion below to mean anything.
  const designationResponse = await operations.authedGet('/donors/designation', signInResponse);
  const superAdminIds = designationResponse.data.superAdminList.map((donor) => donor._id);
  expect(superAdminIds).toContain(memberId);

  // Deletable only at designation 0, one step at a time: 3 -> 1 -> 0.
  await operations.demoteFromSuperAdmin(memberId, signInResponse);
  await operations.demoteToDonor(memberId, signInResponse);

  await operations.deleteDonor(duplicateId, signInResponse);
  await operations.deleteDonor(memberId, signInResponse);
  await operations.signOut(signInResponse);
});
