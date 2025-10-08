const { postPlateletDonationSchema, deletePlateletDonationSchema } = require('./schemas');
const operations = require('../lib/operations');

test('POST&DELETE/platelet-donations: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  const date = Date.now();
  await operations.createPlateletDonation(donorResponse.data.donor._id, date, signInResponse);
  await operations.deletePlateletDonation(donorResponse.data.donor._id, date, signInResponse);
  await operations.signOut(signInResponse);
});
