const { patchDonorSchema, deleteDonorSchema } = require("../schemas");
const { newDonorInfo } = require("../infos");
const { buildDonor } = require("../../lib/utils/builders");
const operations = require("../../operations");

test("POST&PATCH&DELETE/donors: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorCreation = await operations.createDonor(buildDonor(newDonorInfo), signInResponse);
  await operations.authedPatch('/donors/v2', {
    donorId: donorCreation.data.newDonor._id,
    name: 'Blah Blah',
    phone: newDonorInfo.phone,
    studentId: newDonorInfo.studentId,
    bloodGroup: newDonorInfo.bloodGroup,
    hall: newDonorInfo.hall,
    roomNumber: '3009',
    address: 'Azimpur',
    availableToAll: true,
    email: ''
  }, signInResponse, patchDonorSchema);
  await operations.deleteDonor(donorCreation.data.newDonor._id, signInResponse);
  await operations.signOut(signInResponse);
});
