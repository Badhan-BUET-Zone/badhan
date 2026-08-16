const { HTTP_STATUS } = require('../lib/utils/constants');
const operations = require('../lib/operations');

// Guest mode prefixes every call with /guest and answers from faker. Without this mirror a guest
// demo would hit the real route with a fake id and get a 404 that reads like a broken feature.
//
// This one goes through the real renderer rather than a stub, because the certificate page is the
// one page a stub cannot fake: there is nothing to show but the document itself.

test('GET/guest/certificates: guest', async () => {
  const response = await operations.guestGetBinary(
    '/guest/certificates/5e901d56effc590017712345'
  );

  expect(response.status).toEqual(HTTP_STATUS.OK);
  expect(response.headers['content-type']).toEqual('application/pdf');
  expect(Buffer.from(response.data).subarray(0, 5).toString('latin1')).toEqual('%PDF-');
});

// Whether the demo shows the signed-in document — the decision GuestController makes explicitly —
// is pinned in ../certificates/getCertificate.test.js, where a real certificate in both variants is
// already in scope to compare a guest render against. There is nothing here to compare one to.
