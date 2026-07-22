const { HALLS_INDEX } = require('../../lib/utils/constants');
const {
  promoteToVolunteer,
  promoteToHallAdmin,
  createDonor,
  signInSuperAdmin,
} = require('../../lib/operations');

test('PATCH/admins: success', async () => {
  //sign in for authorization
  let signInResponse = await signInSuperAdmin();

  const newDonor = {
    phone: 8801555444777,
    bloodGroup: 2,
    hall: HALLS_INDEX.SUHRAWARDY, // Assuming hall ID is 5
    name: 'Blah Blah',
    studentId: 1606060,
    address: 'Azimpur',
    roomNumber: '3009',
    comment: 'developer of badhan',
    extraDonationCount: 0,
    availableToAll: true,
  };

  //create a new donor
  let createActiveDonorResponse = await createDonor(newDonor, signInResponse);

  // promote the donor to volunteer
  await promoteToVolunteer(createActiveDonorResponse.data.newDonor._id, signInResponse);

  // promote the volunteer to hall admin
  await promoteToHallAdmin(createActiveDonorResponse.data.newDonor._id, signInResponse);
});
