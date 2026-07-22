const { HTTP_STATUS } = require('../../lib/utils/constants');
const patchPasswordSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    token: { type: 'string' },
  },
  required: ['status', 'statusCode', 'token', 'message'],
};

module.exports = {
  patchPasswordSchema,
};
