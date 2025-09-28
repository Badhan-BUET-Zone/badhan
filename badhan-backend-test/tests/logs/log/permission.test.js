const operations = require("../../operations");
const flows = require("../../flows");
const { uniquePhone } = require("../../helpers");
const { superAdminPermissionErrorSchema } = require("../../common/schemas");

test("GET/log: requires super admin (volunteer and hall admin forbidden)", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer User",
    studentId: 1900202,
    address: "Test Address",
    roomNumber: "2002",
    comment: "temporary volunteer",
    extraDonationCount: 0,
    availableToAll: true,
  };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'get',
    path: `/log`,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});

test("DELETE/log: requires super admin (volunteer and hall admin forbidden)", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const newDonorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer User",
    studentId: 1900203,
    address: "Test Address",
    roomNumber: "2003",
    comment: "temporary volunteer",
    extraDonationCount: 0,
    availableToAll: true,
  };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'delete',
    path: `/log`,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo,
  });
});


