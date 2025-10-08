const env = require('../../config');
const operations = require('../lib/operations');
const {
  postActiveDonorSchema,
  deleteActiveDonorSchema,
  activeDonorSearchResultSchema,
} = require('./schemas');

test('POST & DELETE /activeDonors: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  const donorId = donorResponse.data.donor._id;
  // best-effort cleanup
  try {
    await operations.authedDelete(`/activeDonors/${donorId}`, signInResponse);
  } catch (e) {
    /* ignore */
  }
  await operations.authedPost('/activeDonors', { donorId }, signInResponse, postActiveDonorSchema);
  await operations.authedGet(
    `/activeDonors?bloodGroup=-1&hall=${donorResponse.data.donor.hall}&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=false&markedByMe=false&availableToAllOrHall=false`,
    signInResponse,
    activeDonorSearchResultSchema
  );
  await operations.authedDelete(
    `/activeDonors/${donorId}`,
    signInResponse,
    deleteActiveDonorSchema
  );
  await operations.signOut(signInResponse);
});
