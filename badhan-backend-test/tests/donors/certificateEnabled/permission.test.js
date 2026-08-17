const operations = require('../../lib/operations');
const flows = require('../../flows');
const { uniquePhone } = require('../../helpers');
const { superAdminPermissionErrorSchema } = require('../../common/schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// The hall admin case is the one that matters. A hall admin may SET isCertificateEnabled on a donor
// of their own hall, so letting them READ the cross-hall list would be a defensible-sounding
// mistake. Seeing every hall at once is the super admin's business.

test('GET/donors/certificateEnabled: requires super admin (volunteer and hall admin forbidden)', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Certificate Permission Volunteer',
    fatherName: 'Certificate Permission Volunteer Father',
    motherName: 'Certificate Permission Volunteer Mother',
    studentId: 1900302,
    address: 'Test Address',
    roomNumber: '3002',
    comment: 'temporary volunteer',
    extraDonationCount: 0,
    availableToAll: true,
  };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'get',
    path: '/donors/certificateEnabled',
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});
