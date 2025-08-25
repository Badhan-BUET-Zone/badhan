const { donorsSchema } = require("../schemas");
const operations = require("../../operations");

test("GET/guest/donors: guest", async () => {
    await operations.guestGetDonor("123456", donorsSchema);
});
