const { donorsSchema } = require('../schemas');
const operations = require('../../lib/operations');

test('GET/donors: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  await operations.createCallRecord(donorResponse.data.donor._id, signInResponse);
  await operations.createDonation(donorResponse.data.donor._id, 1611100800000, signInResponse);
  await operations.createPlateletDonation(
    donorResponse.data.donor._id,
    1611100800001,
    signInResponse
  );
  await operations.markDonorAsActive(donorResponse.data.donor._id, signInResponse);
  await operations.authedPost(
    '/publicContacts',
    { donorId: donorResponse.data.donor._id, bloodGroup: 2 },
    signInResponse
  );
  await operations.getDonor(donorResponse.data.donor._id, signInResponse, donorsSchema);
  await operations.signOut(signInResponse);
});
