const { HTTP_STATUS } = require('../../lib/utils/constants');
const postUsersRedirectionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    token: { type: 'string' },
    durationSeconds: { type: 'integer' },
  },
  required: ['status', 'statusCode', 'token', 'message', 'durationSeconds'],
};

module.exports = {
  postUsersRedirectionSchema,
};
