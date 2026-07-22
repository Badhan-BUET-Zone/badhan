const { HTTP_STATUS } = require('../../lib/utils/constants');
const signInSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    token: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'token', 'message'],
};

const phoneValidationErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'message'],
};

const passwordValidationErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: '' },
  },
};

const phoneNotFoundErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.NOT_FOUND },
    message: { const: 'Account not found' },
  },
  required: ['status', 'statusCode', 'message'],
};

const passwordIncorrectErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.UNAUTHORIZED },
    message: { const: 'Incorrect phone / password' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  signInSchema,
  phoneValidationErrorSchema,
  phoneNotFoundErrorSchema,
  passwordIncorrectErrorSchema,
};
