const { badhanAxios } = require('../../../api');
const validate = require('jsonschema').validate;
const env = require('../../../config');
const { donorSchema } = require('./schemas');
const operations = require('../../lib/operations');

test('GET/users/me: success', async () => {
  let signInResponse = await operations.signInSuperAdmin();

  let donorResponse = await operations.getMe(signInResponse);
});
