const { HTTP_STATUS } = require('../lib/utils/constants');
const getPlateletDonationReportsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    report: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          counts: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                month: { type: 'integer' },
                year: { type: 'integer' },
                count: { type: 'integer' },
              },
              required: ['month', 'year', 'count'],
            },
          },
          bloodGroup: { type: 'integer' },
        },
      },
    },
    firstPlateletDonationCount: { type: 'integer' },
    hallwiseReport: {
      type: 'object',
      // keyed by hall index; each hall present carries its own report + first-time count
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        properties: {
          report: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                counts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      month: { type: 'integer' },
                      year: { type: 'integer' },
                      count: { type: 'integer' },
                    },
                    required: ['month', 'year', 'count'],
                  },
                },
                bloodGroup: { type: 'integer' },
              },
            },
          },
          firstPlateletDonationCount: { type: 'integer' },
        },
        required: ['report', 'firstPlateletDonationCount'],
      },
    },
  },
  required: ['status', 'statusCode', 'message', 'report', 'firstPlateletDonationCount', 'hallwiseReport'],
};

const invalidRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'message'],
};

const postPlateletDonationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    newPlateletDonation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'integer' },
        _id: { type: 'string' },
        phone: { type: 'integer' },
        donorId: { type: 'string' },
      },
      required: ['date', '_id', 'phone', 'donorId'],
    },
  },
  required: ['status', 'statusCode', 'message', 'newPlateletDonation'],
};

const deletePlateletDonationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    deletedPlateletDonation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        _id: { type: 'string' },
        date: { type: 'number' },
        donorId: { type: 'string' },
        phone: { type: 'number' },
      },
      required: ['_id', 'date', 'donorId', 'phone'],
    },
  },
  required: ['status', 'statusCode', 'message', 'deletedPlateletDonation'],
};

module.exports = {
  getPlateletDonationReportsSchema,
  invalidRequestSchema,
  postPlateletDonationSchema,
  deletePlateletDonationSchema,
};
