const operations = require('../../lib/operations');
const { allDonorSchema } = require('../schemas');

test('GET/donors/all: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.authedGet('/donors/all', signInResponse, allDonorSchema);
  await operations.signOut(signInResponse);
});
