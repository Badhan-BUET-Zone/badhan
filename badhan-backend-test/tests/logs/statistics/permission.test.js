const operations = require('../../operations');
const flows = require('../../flows');
const { uniquePhone } = require('../../helpers');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');

test('GET/log/statistics: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: 'Volunteer User',
    studentId: 1900201,
    address: 'Test Address',
    roomNumber: '2001',
    comment: 'temporary volunteer',
    extraDonationCount: 0,
    availableToAll: true,
  };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'get',
    path: `/log/statistics`,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});
