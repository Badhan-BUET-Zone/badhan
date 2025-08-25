const operations = require("../../operations");

test("POST/users/signIn: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.signOut(signInResponse);
});
