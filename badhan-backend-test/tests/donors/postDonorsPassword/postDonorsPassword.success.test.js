const { passwordSchema } = require("../schemas");
const operations = require("../../operations");

test("POST/donors/password: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);
  const issueResponse = await operations.issueDonorPassword(me.data.donor._id, signInResponse);
  operations.validateSchema(issueResponse.data, passwordSchema);
  await operations.signOut(signInResponse);
});
