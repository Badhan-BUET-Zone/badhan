const { postActiveDonorSchema, deleteActiveDonorSchema } = require("./schemas");
const operations = require("../operations");

test("POST & DELETE /guest/activeDonors: guest", async () => {
  await operations.guestPost('/guest/activeDonors', {}, postActiveDonorSchema);
  await operations.guestDelete('/guest/activeDonors/123456', deleteActiveDonorSchema);
});
