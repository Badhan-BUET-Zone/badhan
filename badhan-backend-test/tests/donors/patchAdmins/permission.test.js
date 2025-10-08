const operations = require('../../lib/operations');
const flows = require('../../flows');
const { uniquePhone } = require('../../helpers');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');

test('PATCH/admins: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create a target donor to patch
  const targetDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: 'Target Donor',
    studentId: 1900501,
    address: 'Test Address',
    roomNumber: '5001',
    comment: 'target donor',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const targetCreation = await operations.createDonor(targetDonorInfo, signInResponse);
  const targetDonorId = targetCreation.data.newDonor._id;

  // Use a separate volunteer as the actor (so body donorId != actor)
  const actorDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: 'Volunteer Actor',
    studentId: 1900502,
    address: 'Test Address',
    roomNumber: '5002',
    comment: 'volunteer actor',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const path = `/admins`;
  const body = { donorId: targetDonorId };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'patch',
    path,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo: actorDonorInfo,
    body,
  });
});
