const operations = require("../../lib/operations");
const { uniquePhone } = require("../../helpers");
const { higherDesignationPermissionErrorSchema } = require("../../common/schemas");

// Ensure lower designation cannot issue token/password for higher designation on POST /donors/password

test("POST/donors/password: volunteer cannot issue for hall admin (higher designation)", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Target Hall Admin",
    studentId: 1900901,
    address: "Test Address",
    roomNumber: "9001",
    comment: "target hall admin",
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer Actor",
    studentId: 1900902,
    address: "Test Address",
    roomNumber: "9002",
    comment: "volunteer actor",
    extraDonationCount: 0,
    availableToAll: true,
  };

  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetId = targetCreation.data.newDonor._id;
  const actorId = actorCreation.data.newDonor._id;

  // Promote target to hall admin (via volunteer → hall admin) and actor to volunteer
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToHallAdmin(targetId, signInResponse);
  await operations.promoteToVolunteer(actorId, signInResponse);

  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);
  await operations.expectErrorWithToken(
    "post",
    "/donors/password",
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    { donorId: targetId }
  );
});

test("POST/donors/password: volunteer cannot issue for super admin (higher designation)", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Target Super Admin",
    studentId: 1900903,
    address: "Test Address",
    roomNumber: "9003",
    comment: "target super admin",
    extraDonationCount: 0,
    availableToAll: true,
  };
  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Volunteer Actor",
    studentId: 1900904,
    address: "Test Address",
    roomNumber: "9004",
    comment: "volunteer actor",
    extraDonationCount: 0,
    availableToAll: true,
  };

  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetId = targetCreation.data.newDonor._id;
  const actorId = actorCreation.data.newDonor._id;

  // Promote target to super admin (via volunteer) and actor to volunteer
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToSuperAdmin(targetId, signInResponse);
  await operations.promoteToVolunteer(actorId, signInResponse);

  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);
  await operations.expectErrorWithToken(
    "post",
    "/donors/password",
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    { donorId: targetId }
  );
});

test("POST/donors/password: hall admin cannot issue for super admin (higher designation)", async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const actorInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Hall Admin Actor",
    studentId: 1900905,
    address: "Test Address",
    roomNumber: "9005",
    comment: "hall admin actor",
    extraDonationCount: 0,
    availableToAll: true,
  };
  const targetInfo = {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: 1,
    name: "Target Super Admin",
    studentId: 1900906,
    address: "Test Address",
    roomNumber: "9006",
    comment: "target super admin",
    extraDonationCount: 0,
    availableToAll: true,
  };

  const actorCreation = await operations.createDonor(actorInfo, signInResponse);
  const targetCreation = await operations.createDonor(targetInfo, signInResponse);
  const actorId = actorCreation.data.newDonor._id;
  const targetId = targetCreation.data.newDonor._id;

  // Promote actor to hall admin BEFORE issuing token to ensure designation reflects correctly
  await operations.promoteToVolunteer(actorId, signInResponse);
  await operations.promoteToHallAdmin(actorId, signInResponse);
  const actorTokenResponse = await operations.issueDonorPassword(actorId, signInResponse);

  // Promote target to super admin
  await operations.promoteToVolunteer(targetId, signInResponse);
  await operations.promoteToSuperAdmin(targetId, signInResponse);

  await operations.expectErrorWithToken(
    "post",
    "/donors/password",
    actorTokenResponse.data.token,
    higherDesignationPermissionErrorSchema,
    { donorId: targetId }
  );
});


