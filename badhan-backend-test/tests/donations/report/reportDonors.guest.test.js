const { badhanAxios } = require('../../../api');
const validate = require('jsonschema').validate;
const { getReportDonorsSchema } = require('../schemas');

test('GET/guest/donations/report/donors: guest', async () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const startDate = now - 15 * ONE_DAY_MS;
  const endDate = now + 15 * ONE_DAY_MS;

  const BLOOD_GROUP = 5;
  let reportDonorsResponse = await badhanAxios.get(
    `/guest/donations/report/donors?startDate=${startDate}&endDate=${endDate}&bloodGroup=${BLOOD_GROUP}&hall=-1`
  );

  let validationResult = validate(reportDonorsResponse.data, getReportDonorsSchema);

  expect(validationResult.errors).toEqual([]);

  // The requested cell's blood group is echoed back on every fake donation
  reportDonorsResponse.data.donations.forEach((donation) => {
    expect(donation.bloodGroup).toBe(BLOOD_GROUP);
  });
});
