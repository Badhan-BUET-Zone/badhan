const operations = require('../../lib/operations');
const { allDonorSchema } = require('../schemas');

// The guest twin takes no query params at all: it fabricates donors and ignores the query string,
// so omitting archiveFlag is not a 400 here. Each fabricated row still carries the field, so the
// guest table renders the same columns as the real one.
test('GET/guest/donors/all: guest', async () => {
  await operations.guestGet('/guest/donors/all', allDonorSchema);
});
