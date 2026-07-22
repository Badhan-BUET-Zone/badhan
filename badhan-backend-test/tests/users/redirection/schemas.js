const { HTTP_STATUS } = require('../../lib/utils/constants');
const postUsersRedirectionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    token: { type: 'string' },
  },
  required: ['status', 'statusCode', 'token', 'message'],
};

const patchUsersRedirectionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.CREATED },
    message: { type: 'string' },
    token: { type: 'string' },
    donor: {
      type: 'object',
      additionalProperties: false,
      properties: {
        _id: { type: 'string' },
        phone: { type: 'integer' },
        name: { type: 'string' },
        studentId: { type: 'string' },
        email: { type: 'string' },
        bloodGroup: { type: 'integer' },
        hall: { type: 'integer' },
        roomNumber: { type: 'string' },
        address: { type: 'string' },
        comment: { type: 'string' },
        commentTime: { type: 'integer' },
        designation: { type: 'integer' },
        availableToAll: { type: 'boolean' },
      },
      required: [
        '_id',
        'phone',
        'name',
        'studentId',
        'email',
        'bloodGroup',
        'hall',
        'roomNumber',
        'address',
        'comment',
        'commentTime',
        'designation',
        'availableToAll',
      ],
    },
  },
  required: ['status', 'statusCode', 'token', 'message', 'donor'],
};

module.exports = {
  postUsersRedirectionSchema,
  patchUsersRedirectionSchema,
};
