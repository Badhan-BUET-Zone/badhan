const { badhanAxios } = require('../../../api');
const validate = require('jsonschema').validate;
const { getReportsSchema } = require('../schemas');

test('GET/guest/donations/report: guest', async () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const startDate = now - 15 * ONE_DAY_MS;
  const endDate = now + 15 * ONE_DAY_MS;

  let reportResponse = await badhanAxios.get(
    `/guest/donations/report?startDate=${startDate}&endDate=${endDate}`
  );

  let validationResult = validate(reportResponse.data, getReportsSchema);

  expect(validationResult.errors).toEqual([]);
});
