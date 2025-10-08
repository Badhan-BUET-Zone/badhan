const { expectGuestError } = require('../lib');
const { invalidRequestSchema } = require('./schemas');

// invalid request test
test('GET/platelet-donations/report: invalid request', async () => {
  // no date query params
  await expectGuestError('get', '/platelet-donations/report', invalidRequestSchema);

  // invalid start date
  await expectGuestError(
    'get',
    '/platelet-donations/report?startDate=2&endDate=1717113600000',
    invalidRequestSchema
  );

  // invalid end date
  await expectGuestError(
    'get',
    '/platelet-donations/report?startDate=1707237110000&endDate=2',
    invalidRequestSchema
  );
});
