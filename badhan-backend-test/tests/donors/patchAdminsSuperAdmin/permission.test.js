const operations = require('../../lib/operations');
const flows = require('../../flows');
const { uniquePhone } = require('../../helpers');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('PATCH/admins/superadmin: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  // Create a target donor (volunteer not required, permission check runs before controller)
  const targetDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Target Donor',
    studentId: 1900601,
    address: 'Test Address',
    roomNumber: '6001',
    comment: 'target donor',
    extraDonationCount: 0,
    availableToAll: true,
  };
  const targetCreation = await operations.createDonor(targetDonorInfo, signInResponse);
  const targetDonorId = targetCreation.data.newDonor._id;

  const actorDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer Actor',
    studentId: 1900602,
    address: 'Test Address',
    roomNumber: '6002',
    comment: 'volunteer actor',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const path = `/admins/superadmin`;
  const body = { donorId: targetDonorId, promoteFlag: true };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'patch',
    path,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo: actorDonorInfo,
    body,
  });
});
