const { guestDelete } = require("../../lib");
const { deleteLogInsSchema } = require("./schemas");

test("DELETE /guest/users/logins/{tokenId}: guest", async () => {
    await guestDelete('/guest/users/logins/abc', deleteLogInsSchema);
});
