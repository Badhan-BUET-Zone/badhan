const operations = require('../lib/operations');
const { postDonationSchema, deleteDonationSchema } = require('./schemas');

test('POST&DELETE/guest/donations: guest', async () => {
  await operations.guestPost('/guest/donations', {}, postDonationSchema);
  const donationDate = Date.now();
  await operations.guestDelete(
    `/guest/donations?donorId=12345&date=${donationDate}`,
    deleteDonationSchema
  );
});
