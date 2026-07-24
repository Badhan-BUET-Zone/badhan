const { badhanAxios } = require('../../api');
const validate = require('jsonschema').validate;
const { donationLogsSchema } = require('./schemas');

test('GET/guest/log/donations: guest', async () => {
  let donationLogsResponse = await badhanAxios.get('/guest/log/donations');

  let validationResult = validate(donationLogsResponse.data, donationLogsSchema);

  expect(validationResult.errors).toEqual([]);
});
