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
} = require("../../operations");

// --- Platelet donation 14 days ago ---
test("searchDonors: platelet donation 14 days ago", async () => {
    let signInResponse = await signInSuperAdmin();
    let donorResponse = await getMe(signInResponse);
    const newDonorInfo = {
      phone: 8801555444780,
      bloodGroup: 2,
      hall: 5,
      name: "Platelet14",
      studentId: 1606063,
      address: "Azimpur",
      roomNumber: "3012",
      comment: "platelet 14 days ago",
      extraDonationCount: 0,
      availableToAll: true,
    };
    let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
    const newDonorId = donorCreationResponse.data.newDonor._id;
    const plateletDonationDate = new Date().getTime() - 14 * 24 * 60 * 60 * 1000;
    let plateletDonationResponse = await createPlateletDonation(newDonorId, plateletDonationDate, signInResponse);
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
      expectedTotalItems: 1,
      expectedDonorIds: [newDonorId]
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
      expectedTotalItems: 0,
      expectedDonorIds: []
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
