const { passwordSchema } = require("../schemas");
const operations = require("../../operations");
const { uniquePhone } = require("../../helpers");

test("POST/donors/password: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  // Create a separate volunteer so we don't invalidate the current admin token
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer User",
    studentId: 1900401,
    address: "Test Address",
    roomNumber: "4001",
    comment: "temporary volunteer",
    extraDonationCount: 0,
    availableToAll: true,
  };
  const donorCreationResponse = await operations.createDonor(newDonorInfo, signInResponse);
  const volunteerId = donorCreationResponse.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);

  const issueResponse = await operations.issueDonorPassword(volunteerId, signInResponse);
  operations.validateSchema(issueResponse.data, passwordSchema);
});
