const { HTTP_STATUS } = require('../../lib/utils/constants');
const deleteLogInsSchema = {
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
  deleteLogInsSchema,
};
