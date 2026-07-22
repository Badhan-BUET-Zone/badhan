const { sameHallPermissionErrorSchema } = require('../common/schemas');
const operations = require('../lib/operations');
const { HALLS_INDEX } = require('../lib/utils/constants');

test('DELETE /callrecords: forbidden when target donor is in different hall and not availableToAll', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create requester (will be promoted to volunteer) in Hall 1
  const donorHall1 = await operations.createDonor(
    {
      phone: 8801555000707,
      bloodGroup: 2,
      hall: HALLS_INDEX.CHATRI,
      name: 'Requester Volunteer',
      studentId: 2006060,
      address: 'Hall 1 Address',
      roomNumber: '1007',
      comment: 'volunteer requester',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );

  // Create target donor in Hall 2 and NOT available to all to force hall permission check
  const donorHall2 = await operations.createDonor(
    {
      phone: 8801555000808,
      bloodGroup: 2,
      hall: HALLS_INDEX.NAZRUL,
      name: 'Target Donor',
      studentId: 2010060,
      address: 'Hall 2 Address',
      roomNumber: '2008',
      comment: 'target different hall',
      extraDonationCount: 0,
      availableToAll: false,
    },
    signInResponse
  );

  // Create a call record for the target donor as Super Admin to get a valid callRecordId
  const callRecordCreateResponse = await operations.createCallRecord(
    donorHall2.data.newDonor._id,
    signInResponse
  );
  const callRecordId = callRecordCreateResponse.data.callRecord._id;

  // Promote requester to volunteer and issue token for them
  const volunteerId = donorHall1.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Expect hall-permission error when attempting to delete a call record for donor from a different hall
  await operations.expectErrorWithToken(
    'delete',
    `/callrecords?donorId=${donorHall2.data.newDonor._id}&callRecordId=${callRecordId}`,
    volunteerTokenResponse.data.token,
    sameHallPermissionErrorSchema
  );

  await operations.signOut(signInResponse);
});
