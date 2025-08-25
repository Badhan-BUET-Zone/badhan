const { donorsNewSchema } = require('../schemas');
const operations = require('../../operations');

test('GET /guest/donors/new: guest', async () => {
  const startTime = Date.now() - 10000;
  const endTime = Date.now() + 10000;
  const res = await operations.guestGetNewDonors({ startTime, endTime, schema: donorsNewSchema });
  expect(Array.isArray(res.data.donors)).toBe(true);
});
