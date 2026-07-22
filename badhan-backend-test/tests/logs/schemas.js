const { HTTP_STATUS } = require('../lib/utils/constants');
const deleteLogsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'message'],
};

const statisticsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    statistics: {
      type: 'object',
      additionalProperties: false,
      properties: {
        donorCount: { type: 'integer' },
        donationCount: { type: 'integer' },
        plateletDonationCount: { type: 'integer' },
        volunteerCount: { type: 'integer' },
      },
      required: ['donorCount', 'donationCount', 'plateletDonationCount', 'volunteerCount'],
    },
  },
  required: ['status', 'statusCode', 'message', 'statistics'],
};

const logSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    logs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'number' },
          _id: { type: 'string' },
          name: { type: 'string' },
          hall: { type: 'number' },
          operation: { type: 'string' },
        },
        required: ['date', '_id', 'name', 'hall', 'operation'],
      },
    },
  },
  required: ['status', 'statusCode', 'message', 'logs'],
};

module.exports = {
  deleteLogsSchema,
  statisticsSchema,
  logSchema,
};
