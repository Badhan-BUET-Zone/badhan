const logInsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 200 },
    message: { type: 'string' },
    logins: {
      type: 'array',
      minItems: 1,
      items: {
        types: 'object',
        additionalProperties: false,
        properties: {
          _id: { type: 'string' },
          os: { type: 'string' },
          device: { type: 'string' },
          browserFamily: { type: 'string' },
          ipAddress: { type: 'string' },
        },
      },
    },
    currentLogin: {
      type: 'object',
      additionalProperties: false,
      properties: {
        _id: { type: 'string' },
        os: { type: 'string' },
        device: { type: 'string' },
        browserFamily: { type: 'string' },
        ipAddress: { type: 'string' },
      },
    },
  },
  required: ['status', 'statusCode', 'message', 'logins', 'currentLogin'],
};

module.exports = {
  logInsSchema,
};
