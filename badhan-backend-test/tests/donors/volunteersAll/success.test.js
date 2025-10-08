const env = require('../../../config');
const operations = require('../../lib/operations');
const { allDesignatedDonorSchema } = require('../schemas');

test('GET/volunteers/all: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  await operations.authedGet('/volunteers/all', signInResponse, allDesignatedDonorSchema);
  await operations.signOut(signInResponse);
});
