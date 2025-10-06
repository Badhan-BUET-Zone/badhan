const { guestGet } = require("../../lib");
const { logInsSchema } = require("./schemas");

test("GET/guest/users/logins: guest", async () => {
    await guestGet('/guest/users/logins', logInsSchema);
});
