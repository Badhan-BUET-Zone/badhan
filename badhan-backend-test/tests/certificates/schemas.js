const { HTTP_STATUS } = require('../lib/utils/constants');

// additionalProperties: false is the point of this schema, not decoration. The certificate page is
// public, so the endpoint's protection is that there is nothing worth stealing in the payload —
// name and studentId, never blood group, phone, email, hall, room or donation history. This schema
// is what fails the day someone widens it.
const getCertificateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'OK' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    certificate: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        studentId: { type: 'string' },
      },
      required: ['name', 'studentId'],
    },
  },
  required: ['status', 'statusCode', 'message', 'certificate'],
};

const certificateNotFoundSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.NOT_FOUND },
    message: { const: 'Certificate not found' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  getCertificateSchema,
  certificateNotFoundSchema,
};
