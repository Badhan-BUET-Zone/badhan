const env = require("../../../config");
const operations = require("../../operations");

test("GET/donors/checkDuplicate: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.checkDuplicate(env.SUPERADMIN_PHONE, signInResponse);
  await operations.signOut(signInResponse);
});
