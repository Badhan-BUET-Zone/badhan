const operations = require('../../lib/operations');
const flows = require('../../flows');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');
const { signInSchema } = require('../../users/signIn/schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('GET/donations/report: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const newDonorInfo = {
    phone: 8801777000011,
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Volunteer User',
    fatherName: 'Volunteer User Father',
    motherName: 'Volunteer User Mother',
    studentId: 1900123,
    address: 'Test Address',
    roomNumber: '1001',
    comment: 'temporary volunteer',
    extraDonationCount: 0,
    availableToAll: true,
  };

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const startDate = now - 15 * ONE_DAY_MS;
  const endDate = now + 15 * ONE_DAY_MS;

  const path = `/donations/report?startDate=${startDate}&endDate=${endDate}`;
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'get',
    path,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});
