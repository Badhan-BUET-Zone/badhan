const env = require("../../config");
const operations = require("../operations");
const { postCallRecordsSchema, deleteCallRecordsSchema } = require("./schemas");

test("POST&DELETE/callrecords: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  const recordCreationResponse = await operations.authedPost('/callrecords', { donorId: donorResponse.data.donor._id }, signInResponse, postCallRecordsSchema);
  await operations.authedDelete(`/callrecords?donorId=${donorResponse.data.donor._id}&callRecordId=${recordCreationResponse.data.callRecord._id}`, signInResponse, deleteCallRecordsSchema);
  await operations.signOut(signInResponse);
});
