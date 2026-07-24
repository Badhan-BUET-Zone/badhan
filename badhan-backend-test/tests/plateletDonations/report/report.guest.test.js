const { badhanAxios } = require('../../../api');
const validate = require('jsonschema').validate;
const { getPlateletDonationReportsSchema } = require('../schemas');

test('GET/guest/platelet-donations/report: guest', async () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const startDate = now - 15 * ONE_DAY_MS;
  const endDate = now + 15 * ONE_DAY_MS;

  let reportResponse = await badhanAxios.get(
    `/guest/platelet-donations/report?startDate=${startDate}&endDate=${endDate}`
  );

  let validationResult = validate(reportResponse.data, getPlateletDonationReportsSchema);

  expect(validationResult.errors).toEqual([]);
});
