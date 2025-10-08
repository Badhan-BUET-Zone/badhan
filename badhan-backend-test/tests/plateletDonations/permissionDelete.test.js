const { sameHallPermissionErrorSchema } = require('../common/schemas');
const operations = require('../lib/operations');

test('DELETE /platelet-donations: forbidden when target donor is in different hall and not availableToAll', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create requester (will be promoted to volunteer) in Hall 1
  const donorHall1 = await operations.createDonor(
    {
      phone: 8801555001515,
      bloodGroup: 2,
      hall: 1,
      name: 'Requester Volunteer',
      studentId: 2006060,
      address: 'Hall 1 Address',
      roomNumber: '1015',
      comment: 'volunteer requester',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );

  // Create target donor in Hall 2 and NOT available to all to force hall permission check
  const donorHall2 = await operations.createDonor(
    {
      phone: 8801555001616,
      bloodGroup: 2,
      hall: 2,
      name: 'Target Donor',
      studentId: 2010060,
      address: 'Hall 2 Address',
      roomNumber: '2016',
      comment: 'target different hall',
      extraDonationCount: 0,
      availableToAll: false,
    },
    signInResponse
  );

  // Create a platelet donation for the target donor as Super Admin
  const donationDate = Date.now();
  await operations.createPlateletDonation(
    donorHall2.data.newDonor._id,
    donationDate,
    signInResponse
  );

  // Promote requester to volunteer and issue token for them
  const volunteerId = donorHall1.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);

  // Expect hall-permission error when attempting to delete the platelet donation of a donor from a different hall
  await operations.expectErrorWithToken(
    'delete',
    `/platelet-donations?donorId=${donorHall2.data.newDonor._id}&date=${donationDate}`,
    volunteerTokenResponse.data.token,
    sameHallPermissionErrorSchema
  );

  await operations.signOut(signInResponse);
});
