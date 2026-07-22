const { HALLS_INDEX } = require('../../lib/utils/constants');
const {
  createDonor,
  signInSuperAdmin,
  promoteToVolunteer,
  promoteToSuperAdmin,
} = require('../../lib/operations');

test('PATCH/admins: success', async () => {
  //sign in for authorization
  let signInResponse = await signInSuperAdmin();

  const newDonorInfo = {
    phone: 8801555444777,
    bloodGroup: 2,
    hall: HALLS_INDEX.SUHRAWARDY,
    name: 'Blah Blah',
    studentId: 1606060,
    address: 'Azimpur',
    roomNumber: '3009',
    comment: 'developer of badhan',
    extraDonationCount: 2,
    availableToAll: true,
  };

  // create a new donor
  let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

  // promote to volunteer
  let sampleVolunteerID = donorCreationResponse.data.newDonor._id;
  await promoteToVolunteer(sampleVolunteerID, signInResponse);

  // promote to super admin
  let superAdminPromotionResult = await promoteToSuperAdmin(sampleVolunteerID, signInResponse);
});
