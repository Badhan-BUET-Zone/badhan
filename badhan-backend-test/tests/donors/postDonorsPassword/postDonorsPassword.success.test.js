const { passwordSchema } = require('../schemas');
const operations = require('../../lib/operations');
const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('POST/donors/password: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  // Create a separate volunteer so we don't invalidate the current admin token
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer User',
    studentId: 1900401,
    address: 'Test Address',
    roomNumber: '4001',
    comment: 'temporary volunteer',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const donorCreationResponse = await operations.createDonor(newDonorInfo, signInResponse);
  const volunteerId = donorCreationResponse.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);

  await operations.issueDonorPassword(volunteerId, signInResponse);
});
