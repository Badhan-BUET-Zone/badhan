const { HTTP_STATUS } = require('../../../lib/utils/constants');
const BODY_password_RequiredError_Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: 'Password is required' },
  },
  required: ['status', 'statusCode', 'message'],
};

const BODY_password_LengthError_Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: 'Password length must be more than 4' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  BODY_password_LengthError_Schema,
  BODY_password_RequiredError_Schema,
};
