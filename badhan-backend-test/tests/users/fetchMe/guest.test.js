const { guestGet } = require("../../lib");
const { donorSchema } = require("./schemas");

test("GET/guest/users/me: guest", async () => {
    await guestGet('/guest/users/me', donorSchema);
});
