const { postPlateletDonationSchema, deletePlateletDonationSchema } = require("./schemas");
const operations = require("../operations");

test("POST&DELETE/guest/platelet-donations: guest", async () => {
  await operations.guestPost('/guest/platelet-donations', null, postPlateletDonationSchema);
  const date = Date.now();
  await operations.guestDelete(`/guest/platelet-donations?donorId=12345&date=${date}`, deletePlateletDonationSchema);
});
