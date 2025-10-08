const {
  createDonor,
  signInSuperAdmin,
  getMe,
  createDonation,
  deleteDonor,
  deleteDonation,
  searchDonors,
  createPlateletDonation,
  deletePlateletDonation
} = require("../../lib/operations");

// --- Blood donation 110 days ago ---
test("searchDonors: blood donation 110 days ago", async () => {
    let signInResponse = await signInSuperAdmin();
    let donorResponse = await getMe(signInResponse);
    const newDonorInfo = {
      phone: 8801555444779,
      bloodGroup: 2,
      hall: 5,
      name: "Blood110",
      studentId: 1606062,
      address: "Azimpur",
      roomNumber: "3011",
      comment: "blood 110 days ago",
      extraDonationCount: 0,
      availableToAll: true,
    };
    let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
    const newDonorId = donorCreationResponse.data.newDonor._id;
    const bloodDonationDate = new Date().getTime() - 110 * 24 * 60 * 60 * 1000;
    let donationResponse = await createDonation(newDonorId, bloodDonationDate, signInResponse);
    // TT
    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: true,
      isNotAvailable: true,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 1,
      expectedDonorIds: [newDonorId]
    });
    // TF
    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: true,
      isNotAvailable: false,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 0,
      expectedDonorIds: []
    });
    // FT
    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: false,
      isNotAvailable: true,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 1,
      expectedDonorIds: [newDonorId]
    });
    // FF
    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: false,
      isNotAvailable: false,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 0,
      expectedDonorIds: []
    });
});
