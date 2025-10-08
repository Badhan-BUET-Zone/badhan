const operations = require('../../lib/operations');
const flows = require('../../flows');
const { uniquePhone } = require('../../helpers');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');

test('GET/donors/designation/all: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: 'Volunteer User',
    studentId: 1900302,
    address: 'Test Address',
    roomNumber: '3002',
    comment: 'temporary volunteer',
    extraDonationCount: 0,
    availableToAll: true,
  };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'get',
    path: `/donors/designation/all`,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});
