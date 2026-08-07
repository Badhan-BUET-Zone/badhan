const operations = require('../lib/operations');
const { getCertificateSchema } = require('./schemas');

// Guest mode prefixes every call with /guest and answers from faker. Without this mirror a guest
// demo would hit the real route with a fake id and get a 404 that reads like a broken feature.

test('GET/guest/certificates: guest', async () => {
  await operations.guestGet('/guest/certificates/5e901d56effc590017712345', getCertificateSchema);
});
