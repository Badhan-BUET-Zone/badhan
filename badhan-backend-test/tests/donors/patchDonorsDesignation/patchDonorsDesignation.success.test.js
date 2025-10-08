const { newDonorInfo } = require("../infos");
const { createDonor, signInSuperAdmin, promoteToVolunteer, demoteToDonor } = require("../../lib/operations");


test("PATCH/donors/designation: success", async () => {
  const signInResponse = await signInSuperAdmin();
  const donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
  await promoteToVolunteer(donorCreationResponse.data.newDonor._id, signInResponse);
  await demoteToDonor(donorCreationResponse.data.newDonor._id, signInResponse);
});
