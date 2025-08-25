const env = require("../../config");
const operations = require("../operations");

test("DELETE/log: delete logs", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.deleteLogs(signInResponse);
  await operations.signOut(signInResponse);
});
