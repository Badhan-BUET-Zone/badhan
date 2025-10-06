const operations = require("../../lib/operations");
const flows = require("../../flows");
const { superAdminPermissionErrorSchema } = require("../../common/schemas");
const { uniquePhone } = require("../../helpers");

test("POST/ publicContacts: requires super admin (volunteer and hall admin forbidden)", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const phoneA = uniquePhone();
  const phoneB = uniquePhone();

  const newDonorInfoA = {
    phone: phoneA,
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer User",
    studentId: 1900125,
    address: "Test Address",
    roomNumber: "1003",
    comment: "temporary volunteer",
    extraDonationCount: 0,
    availableToAll: true,
  };

  // Create volunteer + token and use that donorId as target
  const { donorId } = await flows.createVolunteerWithToken(newDonorInfoA, signInResponse);

  const path = `/publicContacts`;
  const body = { donorId, bloodGroup: 2 };
  const newDonorInfoB = { ...newDonorInfoA, phone: phoneB };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'post',
    path,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo: newDonorInfoB,
    body,
  });
});

test("DELETE/ publicContacts: requires super admin (volunteer and hall admin forbidden)", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const phoneC = uniquePhone();
  const phoneD = uniquePhone();

  const newDonorInfoC = {
    phone: phoneC,
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer User",
    studentId: 1900126,
    address: "Test Address",
    roomNumber: "1004",
    comment: "temporary volunteer",
    extraDonationCount: 0,
    availableToAll: true,
  };

  // Create volunteer + token and use that donorId as target; contactId can be any valid ObjectId string
  const { donorId } = await flows.createVolunteerWithToken(newDonorInfoC, signInResponse);
  const fakeContactId = '507f1f77bcf86cd799439011';

  const path = `/publicContacts?donorId=${donorId}&contactId=${fakeContactId}`;
  const newDonorInfoD = { ...newDonorInfoC, phone: phoneD };
  await flows.assertForbiddenForVolunteerAndHallAdmin({
    method: 'delete',
    path,
    errorSchema: superAdminPermissionErrorSchema,
    signInResponse,
    newDonorInfo: newDonorInfoD,
  });
});


