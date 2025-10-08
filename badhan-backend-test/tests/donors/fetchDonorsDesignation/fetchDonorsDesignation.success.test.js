const env = require("../../../config");
const operations = require("../../lib/operations");

test("GET/donors/designation: success", async () => {
  let signInResponse = await operations.signInSuperAdmin();

  const getMeResponse = await operations.getMe(signInResponse);

    const newDonor1 = {
      phone: 8801555444777,
      bloodGroup: 2,
      hall: getMeResponse.data.donor.hall,
      name: "Blah Blah",
      studentId: 1606060,
      address: "Azimpur",
      roomNumber: "3009",
      comment: "developer of badhan",
      extraDonationCount: 0,
      availableToAll: true,
    }

    const newDonor2 = {
      phone: 8801500000001,
      bloodGroup: 2,
      hall: getMeResponse.data.donor.hall,
      name: "Blah Blah 2",
      studentId: 1606061,
      address: "Azimpur",
      roomNumber: "3009",
      comment: "developer of badhan",
      extraDonationCount: 0,
      availableToAll: true,
    }

  const donorCreationResponse1 = await operations.createDonor(newDonor1, signInResponse);
  const donorCreationResponse2 = await operations.createDonor(newDonor2, signInResponse);

    // Promote the first donor to volunteer
  await operations.promoteToVolunteer(donorCreationResponse1.data.newDonor._id, signInResponse);
  await operations.promoteToVolunteer(donorCreationResponse2.data.newDonor._id, signInResponse);

    // Promote the first donor to hall admin
  await operations.promoteToHallAdmin(donorCreationResponse1.data.newDonor._id, signInResponse);

  await operations.getDesignation(signInResponse);
  await operations.signOut(signInResponse);
});
