const { duplicateDonorsManySchema } = require('../schemas');
const { newDonor_1_info, newDonor_2_info } = require('../infos');
const operations = require('../../lib/operations');

test('GET/donors/phone: fetch donars duplicate all', async () => {
  const superAdminSignInResponse = await operations.signInSuperAdmin();
  const donor1 = await operations.createDonor(newDonor_1_info, superAdminSignInResponse);
  const donor2 = await operations.createDonor(newDonor_2_info, superAdminSignInResponse);
  await operations.promoteToVolunteer(donor1.data.newDonor._id, superAdminSignInResponse);
  const volunteerTokenResponse = await operations.issueDonorPassword(
    donor1.data.newDonor._id,
    superAdminSignInResponse
  );
  const volunteerToken = volunteerTokenResponse.data.token;
  const listOfPhones = [newDonor_1_info.phone, newDonor_2_info.phone];
  const existingDonors = await operations.getDuplicateDonorsByPhones({
    phoneList: listOfPhones,
    token: volunteerToken,
    schema: duplicateDonorsManySchema,
  });
});
