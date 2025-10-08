const postCallRecordsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 201 },
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
    statusCode: { const: 200 },
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
