const getReportsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 200 },
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
    firstDonationCount: { type: 'integer' },
  },
  required: ['status', 'statusCode', 'message', 'report', 'firstDonationCount'],
};

const invalidRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 400 },
    message: { type: 'string' },
  },
  required: ['status', 'statusCode', 'message'],
};

const postDonationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 201 },
    message: { type: 'string' },
    newDonation: {
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
  required: ['status', 'statusCode', 'message', 'newDonation'],
};

const deleteDonationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 200 },
    message: { type: 'string' },
    deletedDonation: {
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
  required: ['status', 'statusCode', 'message', 'deletedDonation'],
};

module.exports = {
  getReportsSchema,
  invalidRequestSchema,
  postDonationSchema,
  deleteDonationSchema,
};
