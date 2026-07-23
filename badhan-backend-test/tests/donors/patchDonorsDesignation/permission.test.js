const {
  sameHallPermissionErrorSchema,
  hallAdminPermissionErrorSchema,
  superAdminDesignationPermissionErrorSchema,
} = require('../../common/schemas');
const operations = require('../../lib/operations');
const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.CHATRI,
  name: 'Blah Blah',
  studentId: 1606060,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'developer of badhan',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

// Create a volunteer (optionally promoted to hall admin) and return a token for them
const makeActorWithToken = async (info, signInResponse, { hallAdmin = false } = {}) => {
  const creation = await operations.createDonor(info, signInResponse);
  const donorId = creation.data.newDonor._id;
  await operations.promoteToVolunteer(donorId, signInResponse);
  if (hallAdmin) {
    await operations.promoteToHallAdmin(donorId, signInResponse);
  }
  const token = await operations.issueDonorPassword(donorId, signInResponse);
  return { donorId, token: token.data.token };
};

test('PATCH /donors/designation: forbidden when target donor is in a different hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actor = await makeActorWithToken(
    donorInfo({ studentId: 2002063, hall: HALLS_INDEX.CHATRI }),
    signInResponse
  );

  const target = await operations.createDonor(
    donorInfo({ studentId: 2012064, hall: HALLS_INDEX.NAZRUL }),
    signInResponse
  );

  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    actor.token,
    sameHallPermissionErrorSchema,
    { donorId: target.data.newDonor._id, designation: 1 }
  );

  await operations.signOut(signInResponse);
});

test('PATCH /donors/designation: a volunteer cannot change any designation (403)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actor = await makeActorWithToken(
    donorInfo({ studentId: 2002063 }),
    signInResponse
  );
  const target = await operations.createDonor(donorInfo({ studentId: 2012064 }), signInResponse);
  await operations.promoteToVolunteer(target.data.newDonor._id, signInResponse);

  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    actor.token,
    hallAdminPermissionErrorSchema,
    { donorId: target.data.newDonor._id, designation: 0 }
  );

  await operations.signOut(signInResponse);
});

test('PATCH /donors/designation: a hall admin cannot promote to super admin (403)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actor = await makeActorWithToken(
    donorInfo({ studentId: 2002063 }),
    signInResponse,
    { hallAdmin: true }
  );
  const target = await operations.createDonor(donorInfo({ studentId: 2012064 }), signInResponse);
  await operations.promoteToVolunteer(target.data.newDonor._id, signInResponse);

  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    actor.token,
    superAdminDesignationPermissionErrorSchema,
    { donorId: target.data.newDonor._id, designation: 3 }
  );

  await operations.signOut(signInResponse);
});

test('PATCH /donors/designation: a hall admin cannot promote to hall admin (403)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actor = await makeActorWithToken(
    donorInfo({ studentId: 2002063 }),
    signInResponse,
    { hallAdmin: true }
  );
  const target = await operations.createDonor(donorInfo({ studentId: 2012064 }), signInResponse);
  await operations.promoteToVolunteer(target.data.newDonor._id, signInResponse);

  await operations.expectErrorWithToken(
    'patch',
    '/donors/designation',
    actor.token,
    superAdminDesignationPermissionErrorSchema,
    { donorId: target.data.newDonor._id, designation: 2 }
  );

  await operations.signOut(signInResponse);
});
