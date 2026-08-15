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

// --- Blood donation 130 days ago ---
test('searchDonors: blood donation 130 days ago', async () => {
  let signInResponse = await signInSuperAdmin();
  let donorResponse = await getMe(signInResponse);
  const newDonorInfo = {
    phone: 8801555444778,
    bloodGroup: 2,
    hall: HALLS_INDEX.SUHRAWARDY,
    name: 'Blood130',
    fatherName: 'Blood130 Father',
    motherName: 'Blood130 Mother',
    studentId: 1606061,
    address: 'Azimpur',
    roomNumber: '3010',
    comment: 'blood 130 days ago',
    extraDonationCount: 0,
    availableToAll: true,
  };
  let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
  const newDonorId = donorCreationResponse.data.newDonor._id;
  const bloodDonationDate = new Date().getTime() - 130 * 24 * 60 * 60 * 1000;
  let donationResponse = await createDonation(newDonorId, bloodDonationDate, signInResponse);
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
    expectedTotalItems: 1,
    expectedDonorIds: [newDonorId],
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
    expectedTotalItems: 0,
    expectedDonorIds: [],
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
