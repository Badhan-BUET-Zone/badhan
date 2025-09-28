const env = require("../../../config");
const operations = require("../../operations");

test("GET/log: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.getLogs(signInResponse);
  await operations.signOut(signInResponse);
});

test("DELETE/log: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.deleteLogs(signInResponse);
  await operations.signOut(signInResponse);
});


