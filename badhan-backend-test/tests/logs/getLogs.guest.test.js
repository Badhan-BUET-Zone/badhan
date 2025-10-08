const { badhanAxios } = require('../../api');
const validate = require('jsonschema').validate;
const { logSchema } = require('./schemas');

test('GET/guest/log: guest', async () => {
  let getLogsResponse = await badhanAxios.get('/guest/log');

  let logsResponseValidationResult = validate(getLogsResponse.data, logSchema);

  expect(logsResponseValidationResult.errors).toEqual([]);
});
