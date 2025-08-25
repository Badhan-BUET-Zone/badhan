const env = require("../../config");
const operations = require("../operations");

test("GET/log/statistics: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.getLogStatistics(signInResponse);
  await operations.signOut(signInResponse);
});
