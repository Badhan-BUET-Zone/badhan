const operations = require("../../operations");
const { duplicateDonorSchema } = require("../schemas");

test("GET/guest/donors/checkDuplicate: guest", async () => {
  await operations.guestGet('/guest/donors/checkDuplicate?phone=8801521438557', duplicateDonorSchema);
});
