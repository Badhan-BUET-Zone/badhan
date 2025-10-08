const { passwordSchema } = require("../schemas");
const operations = require("../../lib/operations");

test("POST/guest/donors/password: guest", async () => {
    const response = await operations.guestIssueDonorPassword(passwordSchema);
    operations.validateSchema(response.data, passwordSchema);
});
