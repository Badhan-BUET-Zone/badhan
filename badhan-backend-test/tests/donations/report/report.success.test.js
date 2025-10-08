const { getReportsSchema } = require('../schemas');
const operations = require('../../lib/operations');

test('GET/donations/report: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const donorId = me.data.donor._id;
  const donationDate = Date.now();
  await operations.createDonation(donorId, donationDate, signInResponse);
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const startDate = donationDate - 15 * ONE_DAY_MS;
  const endDate = donationDate + 15 * ONE_DAY_MS;
  await operations.getDonationReport({
    startDate,
    endDate,
    signInResponse,
    schema: getReportsSchema,
  });
  await operations.deleteDonation(donorId, donationDate, signInResponse);
  await operations.signOut(signInResponse);
});
