const operations = require('../../lib/operations');
const { uniquePhone } = require('../../helpers');
const { higherDesignationPermissionErrorSchema } = require('../../common/schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// Ensure lower designation cannot modify higher designation on PATCH /donors/v2

test('PATCH/donors/v2: volunteer cannot modify hall admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Hall Admin',
    studentId: 1900701,
    address: 'Test Address',
    roomNumber: '7001',
    comment: 'target hall admin',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer Actor',
    studentId: 1900702,
    address: 'Test Address',
    roomNumber: '7002',
    comment: 'volunteer actor',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetId = targetCreation.data.newDonor._id;
  const actorId = actorCreation.data.newDonor._id;

  // Promote target to hall admin (via volunteer → hall admin) and actor to volunteer
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToHallAdmin(targetId, signInResponse);
  await operations.promoteToVolunteer(actorId, signInResponse);

  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);
  const body = {
    donorId: targetId,
    name: 'Updated Name',
    phone: targetInfo.phone,
    studentId: targetInfo.studentId,
    bloodGroup: targetInfo.bloodGroup,
    hall: targetInfo.hall,
    roomNumber: targetInfo.roomNumber,
    address: targetInfo.address,
    availableToAll: targetInfo.availableToAll,
    email: '',
  };

  await operations.expectErrorWithToken(
    'patch',
    '/donors/v2',
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    body
  );
});

test('PATCH/donors/v2: volunteer cannot modify super admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Super Admin',
    studentId: 1900703,
    address: 'Test Address',
    roomNumber: '7003',
    comment: 'target super admin',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer Actor',
    studentId: 1900704,
    address: 'Test Address',
    roomNumber: '7004',
    comment: 'volunteer actor',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetId = targetCreation.data.newDonor._id;
  const actorId = actorCreation.data.newDonor._id;

  // Promote target to super admin (via volunteer) and actor to volunteer
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToSuperAdmin(targetId, signInResponse);
  await operations.promoteToVolunteer(actorId, signInResponse);

  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);
  const body = {
    donorId: targetId,
    name: 'Updated Name',
    phone: targetInfo.phone,
    studentId: targetInfo.studentId,
    bloodGroup: targetInfo.bloodGroup,
    hall: targetInfo.hall,
    roomNumber: targetInfo.roomNumber,
    address: targetInfo.address,
    availableToAll: targetInfo.availableToAll,
    email: '',
  };

  await operations.expectErrorWithToken(
    'patch',
    '/donors/v2',
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    body
  );
});

test('PATCH/donors/v2: hall admin cannot modify super admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Hall Admin Actor',
    studentId: 1900705,
    address: 'Test Address',
    roomNumber: '7005',
    comment: 'hall admin actor',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Super Admin',
    studentId: 1900706,
    address: 'Test Address',
    roomNumber: '7006',
    comment: 'target super admin',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorId = actorCreation.data.newDonor._id;
  const targetId = targetCreation.data.newDonor._id;

  // Promote actor to hall admin BEFORE issuing token to ensure designation reflects correctly
  await operations.promoteToVolunteer(actorId, signInResponse);
  await operations.promoteToHallAdmin(actorId, signInResponse);
  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);

  // Promote target to super admin
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToSuperAdmin(targetId, signInResponse);

  const body = {
    donorId: targetId,
    name: 'Updated Name',
    phone: targetInfo.phone,
    studentId: targetInfo.studentId,
    bloodGroup: targetInfo.bloodGroup,
    hall: targetInfo.hall,
    roomNumber: targetInfo.roomNumber,
    address: targetInfo.address,
    availableToAll: targetInfo.availableToAll,
    email: '',
  };

  await operations.expectErrorWithToken(
    'patch',
    '/donors/v2',
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    body
  );
});
