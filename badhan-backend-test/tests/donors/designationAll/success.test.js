const env = require("../../../config");
const operations = require("../../lib/operations");
const { allDesignatedDonorSchema } = require("../schemas");

test("GET/donors/designation/all: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.authedGet('/donors/designation/all', signInResponse, allDesignatedDonorSchema);
  await operations.signOut(signInResponse);
});


