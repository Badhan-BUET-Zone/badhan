const operations = require("../../lib/operations");
const { patchAdminsSchema } = require("../schemas");

test("PATCH/guest/admins: guest", async () => {
  await operations.guestPatch('/guest/admins', { donorId: '123456' }, patchAdminsSchema);
});
