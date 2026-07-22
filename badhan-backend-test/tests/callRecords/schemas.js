const { HTTP_STATUS } = require('../lib/utils/constants');
const postCallRecordsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    callRecord: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'integer' },
        _id: { type: 'string' },
        callerId: { type: 'string' },
        calleeId: { type: 'string' },
      },
      required: ['date', '_id', 'callerId', 'calleeId'],
    },
  },
  required: ['status', 'statusCode', 'message', 'callRecord'],
};

const deleteCallRecordsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
    deletedCallRecord: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'integer' },
        _id: { type: 'string' },
        callerId: { type: 'string' },
        calleeId: { type: 'string' },
      },
      required: ['date', '_id', 'callerId', 'calleeId'],
    },
  },
  required: ['status', 'statusCode', 'message', 'deletedCallRecord'],
};

module.exports = {
  postCallRecordsSchema,
  deleteCallRecordsSchema,
};
