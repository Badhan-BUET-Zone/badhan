const { searchSchema } = require("../schemas");
const operations = require("../../operations");

test("GET/guest/search/v3: guest", async () => {
  await operations.guestSearchDonors("bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true", null);
});
