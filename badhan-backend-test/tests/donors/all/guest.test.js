const operations = require('../../lib/operations');
const { allDonorSchema } = require('../schemas');

test('GET/guest/donors/all: guest', async () => {
  await operations.guestGet('/guest/donors/all', allDonorSchema);
});
