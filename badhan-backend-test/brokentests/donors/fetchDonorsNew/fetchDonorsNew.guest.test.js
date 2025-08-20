const { badhanAxios } = require('../../api');
const validate = require('jsonschema').validate;
const { donorsNewSchema } = require('./schemas');

test('GET /guest/donors/new: guest', async () => {
  const startTime = Date.now() - 10000;
  const endTime = Date.now() + 10000;
  const res = await badhanAxios.get('/guest/donors/new', {
    params: { startTime, endTime },
  });
  expect(res.status).toBe(200);
  const validationResult = validate(res.data, donorsNewSchema);
  expect(validationResult.valid).toBe(true);
  expect(Array.isArray(res.data.donors)).toBe(true);
});
