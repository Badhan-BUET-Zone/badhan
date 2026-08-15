const { HALLS_INDEX } = require('../../lib/utils/constants');
const {
  createDonor,
  signInSuperAdmin,
  getMe,
  createDonation,
  deleteDonor,
  deleteDonation,
  searchDonors,
  createPlateletDonation,
  deletePlateletDonation,
} = require('../../lib/operations');

// --- Platelet donation 10 days ago ---
test('searchDonors: platelet donation 10 days ago', async () => {
  let signInResponse = await signInSuperAdmin();
  let donorResponse = await getMe(signInResponse);
  const newDonorInfo = {
    phone: 8801555444781,
    bloodGroup: 2,
    hall: HALLS_INDEX.SUHRAWARDY,
    name: 'Platelet10',
    fatherName: 'Platelet10 Father',
    motherName: 'Platelet10 Mother',
    studentId: 1606064,
    address: 'Azimpur',
    roomNumber: '3013',
    comment: 'platelet 10 days ago',
    extraDonationCount: 0,
    availableToAll: true,
  };
  let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
  const newDonorId = donorCreationResponse.data.newDonor._id;
  const plateletDonationDate = new Date().getTime() - 10 * 24 * 60 * 60 * 1000;
  let plateletDonationResponse = await createPlateletDonation(
    newDonorId,
    plateletDonationDate,
    signInResponse
  );
  // TT
  await searchDonors({
    bloodGroup: newDonorInfo.bloodGroup,
    hall: newDonorInfo.hall,
    batch: String(newDonorInfo.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: true,
    signInResponse,
    expectedTotalItems: 1,
    expectedDonorIds: [newDonorId],
  });
  // TF
  await searchDonors({
    bloodGroup: newDonorInfo.bloodGroup,
    hall: newDonorInfo.hall,
    batch: String(newDonorInfo.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: true,
    isNotAvailable: false,
    availableToAll: true,
    signInResponse,
    expectedTotalItems: 0,
    expectedDonorIds: [],
  });
  // FT
  await searchDonors({
    bloodGroup: newDonorInfo.bloodGroup,
    hall: newDonorInfo.hall,
    batch: String(newDonorInfo.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: false,
    isNotAvailable: true,
    availableToAll: true,
    signInResponse,
    expectedTotalItems: 1,
    expectedDonorIds: [newDonorId],
  });
  // FF
  await searchDonors({
    bloodGroup: newDonorInfo.bloodGroup,
    hall: newDonorInfo.hall,
    batch: String(newDonorInfo.studentId).substring(0, 2),
    name: '',
    address: '',
    isAvailable: false,
    isNotAvailable: false,
    availableToAll: true,
    signInResponse,
    expectedTotalItems: 0,
    expectedDonorIds: [],
  });
});
