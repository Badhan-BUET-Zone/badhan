const operations = require('../operations');

async function createVolunteerWithToken(newDonorInfo, signInResponse, options = {}) {
  const { alsoPromoteHallAdmin = false } = options;
  const donorCreationResponse = await operations.createDonor(newDonorInfo, signInResponse);
  const donorId = donorCreationResponse.data.newDonor._id;
  await operations.promoteToVolunteer(donorId, signInResponse);
  if (alsoPromoteHallAdmin) {
    await operations.promoteToHallAdmin(donorId, signInResponse);
  }
  const volunteerSignIn = await operations.issueDonorPassword(donorId, signInResponse);
  return {
    donorId,
    volunteerToken: volunteerSignIn.data.token,
    donorCreationResponse,
    volunteerSignIn,
  };
}

async function assertForbiddenForVolunteerAndHallAdmin({
  method,
  path,
  errorSchema,
  signInResponse,
  newDonorInfo,
  body,
}) {
  const { donorId, volunteerToken } = await createVolunteerWithToken(newDonorInfo, signInResponse);
  await operations.expectErrorWithToken(method, path, volunteerToken, errorSchema, body);
  await operations.promoteToHallAdmin(donorId, signInResponse);
  await operations.expectErrorWithToken(method, path, volunteerToken, errorSchema, body);
  return { donorId, volunteerToken };
}

module.exports = {
  createVolunteerWithToken,
  assertForbiddenForVolunteerAndHallAdmin,
};
