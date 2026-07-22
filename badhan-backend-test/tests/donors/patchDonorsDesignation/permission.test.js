const { sameHallPermissionErrorSchema } = require('../../common/schemas');
const operations = require('../../lib/operations');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('PATCH /donors/designation: forbidden when target donor is in different hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create requester (will be promoted to volunteer) in Hall 1
  const donorHall1 = await operations.createDonor(
    {
      phone: 8801555006666,
      bloodGroup: 2,
      hall: HALLS_INDEX.CHATRI,
      name: 'Requester Volunteer',
      studentId: 2002063,
      address: 'Hall 1 Address',
      roomNumber: '16666',
      comment: 'volunteer requester',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );

  // Create target donor in Hall 2
  const donorHall2 = await operations.createDonor(
    {
      phone: 8801555006767,
      bloodGroup: 2,
      hall: HALLS_INDEX.NAZRUL,
      name: 'Target Donor',
      studentId: 2012064,
      address: 'Hall 2 Address',
      roomNumber: '26767',
      comment: 'target different hall',
      extraDonationCount: 0,
      availableToAll: false,
    },
    signInResponse
  );

  // Promote requester to volunteer and issue token for them
  const volunteerId = donorHall1.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Expect hall-permission error when attempting to change designation for donor from a different hall
  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    volunteerTokenResponse.data.token,
    sameHallPermissionErrorSchema,
    { donorId: donorHall2.data.newDonor._id, promoteFlag: true }
  );

  await operations.signOut(signInResponse);
});
