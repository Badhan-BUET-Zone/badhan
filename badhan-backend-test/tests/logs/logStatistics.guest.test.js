const { badhanAxios } = require('../../api');
const validate = require('jsonschema').validate;
const { statisticsSchema } = require('./schemas');

test('GET/guest/log/statistics: guest', async () => {
  let statisticsResponse = await badhanAxios.get('/guest/log/statistics');

  let validationResult = validate(statisticsResponse.data, statisticsSchema);

  expect(validationResult.errors).toEqual([]);
});
