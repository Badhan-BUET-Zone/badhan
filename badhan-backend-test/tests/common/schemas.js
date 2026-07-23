const { HTTP_STATUS } = require('../lib/utils/constants');
const jwtInvalidSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.UNAUTHORIZED },
    message: { const: 'Invalid Authentication' },
  },
  required: ['status', 'statusCode', 'message'],
};
const expiredTokenSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.UNAUTHORIZED },
    message: { const: 'You have been logged out' },
  },
  required: ['status', 'statusCode', 'message'],
};

const routeNotFoundErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.NOT_FOUND },
    message: { const: 'Route not found' },
  },
  required: ['status', 'statusCode', 'message'],
};

const jsonBodyParseErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: 'Malformed JSON' },
  },
  required: ['status', 'statusCode', 'message'],
};

const internalServerErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'EXCEPTION' },
    statusCode: { const: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    message: { const: 'UNCAUGHT ERROR: undefined' },
    details: {
      type: 'object',
      additionalProperties: false,
      properties: {
        dummy: { const: 'intentional internal server error' },
      },
      required: ['dummy'],
    },
  },
  required: ['status', 'statusCode', 'message', 'details'],
};

const superAdminPermissionErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'You are not permitted to access this route' },
  },
  required: ['status', 'statusCode', 'message'],
};

const hallAdminPermissionErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'Only hall admins or above can access this route' },
  },
  required: ['status', 'statusCode', 'message'],
};

const higherDesignationPermissionErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'You cannot modify the details of a Badhan member with higher designation' },
  },
  required: ['status', 'statusCode', 'message'],
};

const sameHallPermissionErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'You are not authorized to access a donor of different hall' },
  },
  required: ['status', 'statusCode', 'message'],
};

// Forbidden when a non-super-admin tries to set or clear a hall-admin/super-admin designation
const superAdminDesignationPermissionErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'Only super admins can change hall admin or super admin designations' },
  },
  required: ['status', 'statusCode', 'message'],
};

// Factory for the merged designation route's 409 conflict responses (distinct messages)
const conflictErrorSchema = (message) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.CONFLICT },
    message: { const: message },
  },
  required: ['status', 'statusCode', 'message'],
});

module.exports = {
  jwtInvalidSchema,
  expiredTokenSchema,
  routeNotFoundErrorSchema,
  jsonBodyParseErrorSchema,
  internalServerErrorSchema,
  superAdminPermissionErrorSchema,
  hallAdminPermissionErrorSchema,
  higherDesignationPermissionErrorSchema,
  sameHallPermissionErrorSchema,
  superAdminDesignationPermissionErrorSchema,
  conflictErrorSchema,
};
