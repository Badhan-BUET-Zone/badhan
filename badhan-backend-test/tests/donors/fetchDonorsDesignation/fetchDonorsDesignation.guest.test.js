const operations = require("../../operations");
const { designationSchema } = require("../schemas");

test("GET/guest/donors/designation: guest", async () => {
  await operations.guestGet('/guest/donors/designation', designationSchema);
});
