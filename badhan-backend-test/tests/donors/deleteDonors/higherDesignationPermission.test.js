const operations = require('../../lib/operations');
const { uniquePhone } = require('../../helpers');
const { higherDesignationPermissionErrorSchema } = require('../../common/schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// Ensure lower designation cannot delete higher designation on DELETE /donors

test('DELETE/donors: volunteer cannot delete hall admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Hall Admin',
    studentId: 1900801,
    address: 'Test Address',
    roomNumber: '8001',
    comment: 'target hall admin',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer Actor',
    studentId: 1900802,
    address: 'Test Address',
    roomNumber: '8002',
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
  const path = `/donors?donorId=${targetId}`;
  await operations.expectErrorWithToken(
    'delete',
    path,
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema
  );
});

test('DELETE/donors: volunteer cannot delete super admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Super Admin',
    studentId: 1900803,
    address: 'Test Address',
    roomNumber: '8003',
    comment: 'target super admin',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer Actor',
    studentId: 1900804,
    address: 'Test Address',
    roomNumber: '8004',
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
  const path = `/donors?donorId=${targetId}`;
  await operations.expectErrorWithToken(
    'delete',
    path,
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema
  );
});

test('DELETE/donors: hall admin cannot delete super admin (higher designation)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Hall Admin Actor',
    studentId: 1900805,
    address: 'Test Address',
    roomNumber: '8005',
    comment: 'hall admin actor',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Super Admin',
    studentId: 1900806,
    address: 'Test Address',
    roomNumber: '8006',
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

  const path = `/donors?donorId=${targetId}`;
  await operations.expectErrorWithToken(
    'delete',
    path,
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema
  );
});
