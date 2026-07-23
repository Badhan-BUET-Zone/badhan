const { uniquePhone } = require('../../helpers');
const { HALLS_INDEX } = require('../../lib/utils/constants');
const {
  createDonor,
  getDonor,
  updateDonor,
  signInSuperAdmin,
  getMe,
  promoteToVolunteer,
  demoteToDonor,
  promoteToHallAdmin,
  promoteToSuperAdmin,
  demoteFromSuperAdmin,
} = require('../../lib/operations');

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Blah Blah',
  studentId: 1606060,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'developer of badhan',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const expectDesignation = async (donorId, signInResponse, expected) => {
  const fetched = await getDonor(donorId, signInResponse);
  expect(fetched.data.donor.designation).toBe(expected);
};

test('PATCH /donors/designation: super admin toggles a donor 0 -> 1 -> 0', async () => {
  const signInResponse = await signInSuperAdmin();
  const creation = await createDonor(donorInfo(), signInResponse);
  const donorId = creation.data.newDonor._id;

  await promoteToVolunteer(donorId, signInResponse);
  await expectDesignation(donorId, signInResponse, 1);

  await demoteToDonor(donorId, signInResponse);
  await expectDesignation(donorId, signInResponse, 0);
});

test('PATCH /donors/designation: super admin promotes a volunteer to super admin (1 -> 3)', async () => {
  const signInResponse = await signInSuperAdmin();
  const creation = await createDonor(donorInfo(), signInResponse);
  const donorId = creation.data.newDonor._id;

  await promoteToVolunteer(donorId, signInResponse);
  await promoteToSuperAdmin(donorId, signInResponse);
  await expectDesignation(donorId, signInResponse, 3);
});

test('PATCH /donors/designation: super admin demotes a super admin (3 -> 1)', async () => {
  const signInResponse = await signInSuperAdmin();
  const creation = await createDonor(donorInfo(), signInResponse);
  const donorId = creation.data.newDonor._id;

  await promoteToVolunteer(donorId, signInResponse);
  await promoteToSuperAdmin(donorId, signInResponse);
  await demoteFromSuperAdmin(donorId, signInResponse);
  await expectDesignation(donorId, signInResponse, 1);
});

test('PATCH /donors/designation: super admin promotes a volunteer whose hall is > 6 to super admin (skips hall check)', async () => {
  const signInResponse = await signInSuperAdmin();
  const info = donorInfo();
  const creation = await createDonor(info, signInResponse);
  const donorId = creation.data.newDonor._id;

  // Promote to volunteer while in a valid hall, then move the donor to the Unknown hall (> 6)
  await promoteToVolunteer(donorId, signInResponse);
  await updateDonor(
    {
      donorId,
      name: info.name,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: HALLS_INDEX.UNKNOWN,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      email: '',
    },
    signInResponse
  );

  // Super-admin promotion carries no hall check, so this succeeds despite hall > 6
  await promoteToSuperAdmin(donorId, signInResponse);
  await expectDesignation(donorId, signInResponse, 3);
});

test('PATCH /donors/designation: promoting a volunteer to hall admin demotes the previous hall admin', async () => {
  const signInResponse = await signInSuperAdmin();

  // Existing hall admin in Suhrawardy
  const incumbentCreation = await createDonor(donorInfo({ studentId: 1606061 }), signInResponse);
  const incumbentId = incumbentCreation.data.newDonor._id;
  await promoteToVolunteer(incumbentId, signInResponse);
  await promoteToHallAdmin(incumbentId, signInResponse);
  await expectDesignation(incumbentId, signInResponse, 2);

  // New volunteer in the same hall promoted to hall admin
  const successorCreation = await createDonor(donorInfo({ studentId: 1606062 }), signInResponse);
  const successorId = successorCreation.data.newDonor._id;
  await promoteToVolunteer(successorId, signInResponse);
  await promoteToHallAdmin(successorId, signInResponse);

  await expectDesignation(successorId, signInResponse, 2);
  // The previous hall admin is demoted back to volunteer
  await expectDesignation(incumbentId, signInResponse, 1);
});

test('PATCH /donors/designation: super admin can demote themselves (3 -> 1)', async () => {
  const signInResponse = await signInSuperAdmin();
  const me = await getMe(signInResponse);

  await demoteFromSuperAdmin(me.data.donor._id, signInResponse);
  // Re-fetch the target directly (getMe would return the token-cached login snapshot)
  await expectDesignation(me.data.donor._id, signInResponse, 1);
});
