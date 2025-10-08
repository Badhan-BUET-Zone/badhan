const env = require('../../../config');
const operations = require('../../lib/operations');

// success
test('GET/platelet-donations/report: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorId = (await operations.getMe(signInResponse)).data.donor._id;

  const plateletDonationDate = Date.now();
  await operations.createPlateletDonation(donorId, plateletDonationDate, signInResponse);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const startDate = plateletDonationDate - 15 * ONE_DAY_MS;
  const endDate = plateletDonationDate + 15 * ONE_DAY_MS;

  await operations.getPlateletDonationReport({ startDate, endDate, signInResponse });

  await operations.deletePlateletDonation(donorId, plateletDonationDate, signInResponse);
  await operations.signOut(signInResponse);
});
