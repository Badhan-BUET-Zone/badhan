const { sameHallPermissionErrorSchema } = require('../../common/schemas');
const operations = require('../../lib/operations');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('PATCH /donors/v2: forbidden when target donor is in different hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create requester (will be promoted to volunteer) in Hall 1
  const donorHall1 = await operations.createDonor(
    {
      phone: 8801555006262,
      bloodGroup: 2,
      hall: HALLS_INDEX.CHATRI,
      name: 'Requester Volunteer',
      studentId: 2001061,
      address: 'Hall 1 Address',
      roomNumber: '16262',
      comment: 'volunteer requester',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );

  // Create target donor in Hall 2
  const targetInfo = {
    phone: 8801555006363,
    bloodGroup: 2,
    hall: HALLS_INDEX.NAZRUL,
    name: 'Target Donor',
    studentId: 2011062,
    address: 'Hall 2 Address',
    roomNumber: '26363',
    comment: 'target different hall',
    extraDonationCount: 0,
    availableToAll: false,
  };
  const donorHall2 = await operations.createDonor(targetInfo, signInResponse);

  // Promote requester to volunteer and issue token for them
  const volunteerId = donorHall1.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Expect hall-permission error when patching donor from a different hall
  await operations.expectErrorWithToken(
    'patch',
    '/donors/v2',
    volunteerTokenResponse.data.token,
    sameHallPermissionErrorSchema,
    {
      donorId: donorHall2.data.newDonor._id,
      name: 'Updated Name',
      phone: targetInfo.phone,
      studentId: targetInfo.studentId,
      bloodGroup: targetInfo.bloodGroup,
      hall: targetInfo.hall,
      roomNumber: targetInfo.roomNumber,
      address: targetInfo.address,
      availableToAll: targetInfo.availableToAll,
      archiveFlag: false,
      email: '',
    }
  );

  await operations.signOut(signInResponse);
});
