const { HTTP_STATUS } = require('../../lib/utils/constants');
const donorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: HTTP_STATUS.OK },
    message: { type: 'string' },
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
        archiveFlag: { type: 'boolean' },
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
        'archiveFlag',
      ],
    },
  },
  required: ['status', 'statusCode', 'message', 'donor'],
};

module.exports = {
  donorSchema,
};
