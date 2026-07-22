const { HTTP_STATUS } = require('../../lib/utils/constants');
const signOutSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  signOutSchema,
};
