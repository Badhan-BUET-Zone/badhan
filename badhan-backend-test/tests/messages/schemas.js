// additionalProperties: false everywhere, and that is the point of these schemas rather than a
// habit. A chat message row is three fields and a joined sender; the sender is five fields and
// no more. `password`, `email`, `phone` and `address` are absent from the projection because
// nobody named them — a schema that tolerated an extra key would pass on the day somebody
// "just added phone so we can call people from the chat".

const messageItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'text', 'date', 'sender'],
  properties: {
    _id: { type: 'string' },
    text: { type: 'string' },
    date: { type: 'number' },
    // null is a real, expected state: the sender's donor record is gone.
    sender: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['_id', 'name', 'studentId', 'hall', 'designation'],
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        // The batch is its first two digits, derived on the client.
        studentId: { type: 'string' },
        hall: { type: 'number' },
        designation: { type: 'number' },
      },
    },
  },
};

const getMessagesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', 'messages', 'serverTime', 'hasMore'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    messages: { type: 'array', items: messageItemSchema },
    // The watermark the client stores and hands back as `after`. Never the browser's clock.
    serverTime: { type: 'number' },
    hasMore: { type: 'boolean' },
  },
};

const postMessageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', 'sentMessage'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    // The same element shape GET returns, so the sender can render their own bubble with no
    // second round trip. Sharing messageItemSchema is what pins that claim.
    sentMessage: messageItemSchema,
  },
};

const deleteMessageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
  },
};

module.exports = {
  messageItemSchema,
  getMessagesSchema,
  postMessageSchema,
  deleteMessageSchema,
};
