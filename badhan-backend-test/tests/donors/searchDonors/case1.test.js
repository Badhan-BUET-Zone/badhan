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

test('GET/search/v3: success', async () => {
  let signInResponse = await signInSuperAdmin();
  let donorResponse = await getMe(signInResponse);

  const newDonorInfo = {
    phone: 8801555444777,
    bloodGroup: 2,
    hall: HALLS_INDEX.SUHRAWARDY,
    name: 'Blah Blah',
    fatherName: 'Search Case1 Father',
    motherName: 'Search Case1 Mother',
    studentId: 1606060,
    address: 'Azimpur',
    roomNumber: '3009',
    comment: 'developer of badhan',
    extraDonationCount: 0,
    availableToAll: true,
  };

  let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

  const newDonorId = donorCreationResponse.data.newDonor._id;

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
});
