const env = require("../../config");
const operations = require("../lib/operations");
const { postDonationSchema, deleteDonationSchema } = require("./schemas");

test("POST&DELETE/donations: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  const donationDate = Date.now();
  await operations.authedPost('/donations', { donorId: donorResponse.data.donor._id, date: donationDate }, signInResponse, postDonationSchema);
  await operations.authedDelete(`/donations?donorId=${donorResponse.data.donor._id}&date=${donationDate}`, signInResponse, deleteDonationSchema);
  await operations.signOut(signInResponse);
});
