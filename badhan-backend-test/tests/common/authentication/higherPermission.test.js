const { higherDesignationPermissionErrorSchema } = require('../schemas');
const operations = require('../../lib/operations');

test('hall admin permission test', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donor1 = await operations.createDonor(
    {
      phone: 8801555444777,
      bloodGroup: 2,
      hall: 1,
      name: 'Blah Blah',
      studentId: 1606060,
      address: 'Azimpur',
      roomNumber: '3009',
      comment: 'developer of badhan',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );
  const donor2 = await operations.createDonor(
    {
      phone: 8801555444778,
      bloodGroup: 2,
      hall: 1,
      name: 'Blah Blah',
      studentId: 1606060,
      address: 'Azimpur',
      roomNumber: '3009',
      comment: 'developer of badhan',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );
  const volunteer1Id = donor1.data.newDonor._id;
  const volunteer2Id = donor2.data.newDonor._id;
  await operations.promoteToVolunteer(volunteer1Id, signInResponse);
  await operations.promoteToVolunteer(volunteer2Id, signInResponse);
  await operations.promoteToHallAdmin(volunteer2Id, signInResponse);
  const volunteer1TokenResponse = await operations.issueDonorPassword(volunteer1Id, signInResponse);
  await operations.expectErrorWithToken(
    'delete',
    `/donors?donorId=${volunteer2Id}`,
    volunteer1TokenResponse.data.token,
    higherDesignationPermissionErrorSchema
  );
  await operations.signOut(signInResponse);
});
