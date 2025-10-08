const { hallAdminPermissionErrorSchema } = require('../schemas');
const operations = require('../../lib/operations');

test('hall admin permission test', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const newDonorInfo = {
    phone: 8801555444777,
    bloodGroup: 2,
    hall: me.data.donor.hall,
    name: 'Blah Blah',
    studentId: 1606060,
    address: 'Azimpur',
    roomNumber: '3009',
    comment: 'developer of badhan',
    extraDonationCount: 2,
    availableToAll: true,
  };
  const donorCreation = await operations.createDonor(newDonorInfo, signInResponse);
  const volunteerId = donorCreation.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);
  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    volunteerTokenResponse.data.token,
    hallAdminPermissionErrorSchema,
    { donorId: me.data.donor._id, promoteFlag: true }
  );
  await operations.signOut(signInResponse);
});
