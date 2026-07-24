const { badhanAxios } = require('../../../api');
const validate = require('jsonschema').validate;
const { getPlateletReportDonorsSchema } = require('../schemas');

test('GET/guest/platelet-donations/report/donors: guest', async () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const startDate = now - 15 * ONE_DAY_MS;
  const endDate = now + 15 * ONE_DAY_MS;

  const BLOOD_GROUP = 3;
  let reportDonorsResponse = await badhanAxios.get(
    `/guest/platelet-donations/report/donors?startDate=${startDate}&endDate=${endDate}&bloodGroup=${BLOOD_GROUP}&hall=-1`
  );

  let validationResult = validate(reportDonorsResponse.data, getPlateletReportDonorsSchema);

  expect(validationResult.errors).toEqual([]);

  // The requested cell's blood group is echoed back on every fake donation
  reportDonorsResponse.data.donations.forEach((donation) => {
    expect(donation.bloodGroup).toBe(BLOOD_GROUP);
  });
});
