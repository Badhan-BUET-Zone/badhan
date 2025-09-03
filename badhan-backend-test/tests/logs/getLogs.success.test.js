const env = require("../../config/config");
const operations = require("../operations");

test("GET/log: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.getLogs(signInResponse);
  await operations.signOut(signInResponse);
});
