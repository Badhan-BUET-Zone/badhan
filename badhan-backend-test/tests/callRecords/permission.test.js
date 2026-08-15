const { sameHallPermissionErrorSchema } = require('../common/schemas');
const operations = require('../lib/operations');
const { HALLS_INDEX } = require('../lib/utils/constants');

test('POST /callrecords: forbidden when target donor is in different hall and not availableToAll', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create requester (will be promoted to volunteer) in Hall 1
  const donorHall1 = await operations.createDonor(
    {
      phone: 8801555000505,
      bloodGroup: 2,
      hall: HALLS_INDEX.CHATRI,
      name: 'Requester Volunteer',
      fatherName: 'Requester Volunteer Father',
      motherName: 'Requester Volunteer Mother',
      studentId: 2006060,
      address: 'Hall 1 Address',
      roomNumber: '1005',
      comment: 'volunteer requester',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );

  // Create target donor in Hall 2 and NOT available to all to force hall permission check
  const donorHall2 = await operations.createDonor(
    {
      phone: 8801555000606,
      bloodGroup: 2,
      hall: HALLS_INDEX.NAZRUL,
      name: 'Target Donor',
      fatherName: 'Target Donor Father',
      motherName: 'Target Donor Mother',
      studentId: 2010060,
      address: 'Hall 2 Address',
      roomNumber: '2006',
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

  // Expect hall-permission error when creating a call record for donor from a different hall
  await operations.expectErrorWithToken(
    'post',
    '/callrecords',
    volunteerTokenResponse.data.token,
    sameHallPermissionErrorSchema,
    { donorId: donorHall2.data.newDonor._id }
  );

  await operations.signOut(signInResponse);
});
