const operations = require("../../lib/operations");
const { allDesignatedDonorSchema } = require("../schemas");

test("GET/guest/donors/designation/all: guest", async () => {
  await operations.guestGet('/guest/donors/designation/all', allDesignatedDonorSchema);
});
