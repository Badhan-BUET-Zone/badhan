// additionalProperties: false everywhere, and that is the point of these schemas. A member's own
// view of a chat is four fields: the deleted flag, its date, the token totals, the message count
// and the step lock are all on the stored document and none of them is the member's to see. A
// schema that tolerated an extra key would pass on the day one of them leaked.

const chatSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'title', 'createdAt', 'updatedAt'],
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
};

// `chatId` is deliberately absent: the caller already has it.
const messageItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'seq', 'role', 'content', 'createdAt'],
  properties: {
    _id: { type: 'string' },
    seq: { type: 'number' },
    role: { type: 'string', enum: ['user', 'assistant', 'tool'] },
    content: { type: 'string' },
    toolCalls: { type: 'array' },
    openaiModel: { type: 'string' },
    usage: { type: 'object' },
    toolCallId: { type: 'string' },
    run: { type: 'object' },
    createdAt: { type: 'number' },
  },
};

const envelope = (extraRequired, extraProperties) => ({
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', ...extraRequired],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    ...extraProperties,
  },
});

const listChatsSchema = envelope(['chats'], { chats: { type: 'array', items: chatSummarySchema } });

const getChatSchema = envelope(['chat', 'messages'], {
  chat: chatSummarySchema,
  messages: { type: 'array', items: messageItemSchema },
});

const renameChatSchema = envelope(['chat'], { chat: chatSummarySchema });

const deleteChatSchema = envelope([], {});

// The one 404 every "not yours to see" case shares.
const chatNotFoundSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message'],
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: 404 },
    message: { const: 'Chat not found' },
  },
};

// `systemPrompt` is optional here and each test says whether it must be there: a super admin gets
// it, every other member must not get the key at all.
const configSchema = envelope(['configured', 'model', 'toolCount'], {
  configured: { type: 'boolean' },
  model: { type: 'string' },
  toolCount: { type: 'number' },
  systemPrompt: { type: 'string' },
});

// The refusals a step can answer with. `reason` says which 409 it is.
const stepRefusalSchema = (statusCode, reasons) => ({
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', ...(reasons ? ['reason'] : [])],
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: statusCode },
    message: { type: 'string' },
    ...(reasons ? { reason: { enum: reasons } } : {}),
  },
});

const notConfiguredSchema = {
  ...stepRefusalSchema(503),
  properties: { ...stepRefusalSchema(503).properties, message: { const: 'The agent is not set up on this server.' } },
};

const toolCallRecordedSchema = envelope(['toolMessage'], { toolMessage: messageItemSchema });

// The review page. Who a chat belongs to is three fields from the donor record and nothing else —
// no phone, no address — or null when that record has been deleted.
const reviewMemberSchema = {
  type: ['object', 'null'],
  additionalProperties: false,
  required: ['_id', 'name', 'hall', 'designation'],
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    hall: { type: 'number' },
    designation: { type: 'number' },
  },
};

const reviewMembersSchema = envelope(['members'], {
  members: {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['donorId', 'member', 'chatCount', 'deletedChatCount', 'lastActivity'],
      properties: {
        donorId: { type: 'string' },
        member: reviewMemberSchema,
        chatCount: { type: 'number' },
        deletedChatCount: { type: 'number' },
        lastActivity: { type: 'number' },
      },
    },
  },
});

// Everything about a chat but its step lock.
const reviewChatSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    '_id', 'owner', 'title', 'createdAt', 'updatedAt', 'userDeletedChat', 'userDeletedAt',
    'messageCount', 'promptTokens', 'completionTokens',
  ],
  properties: {
    _id: { type: 'string' },
    owner: { type: 'string' },
    title: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    userDeletedChat: { type: 'boolean' },
    userDeletedAt: { type: ['number', 'null'] },
    messageCount: { type: 'number' },
    promptTokens: { type: 'number' },
    completionTokens: { type: 'number' },
  },
};

const reviewMemberChatsSchema = envelope(['member', 'chats'], {
  member: reviewMemberSchema,
  chats: { type: 'array', items: reviewChatSchema },
});

const reviewTranscriptSchema = envelope(['chat', 'member', 'messages'], {
  chat: reviewChatSchema,
  member: reviewMemberSchema,
  messages: { type: 'array', items: messageItemSchema },
});

// The download. The opposite of everything above: it exists to carry every stored field, the step
// lock and each message's chatId included, so these schemas say what must be there and allow more.
// Whatever a document holds beyond the schema is in the file too.
const storedChatSchema = {
  type: 'object',
  required: [...reviewChatSchema.required, 'stepStartedAt'],
  properties: { ...reviewChatSchema.properties, stepStartedAt: { type: ['number', 'null'] } },
};

const storedMessageSchema = {
  type: 'object',
  required: [...messageItemSchema.required, 'chatId'],
  properties: {
    ...messageItemSchema.properties,
    role: { type: 'string', enum: ['user', 'assistant', 'tool', 'error'] },
    chatId: { type: 'string' },
    modelCall: { type: 'object' },
  },
};

// A model call as the export rebuilds it. Exactly one of conversationLength and messages is set.
const exportedModelCallSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'seq', 'outcome', 'requestId', 'durationMs', 'request', 'systemMessage', 'conversationLength',
    'messages', 'response', 'error',
  ],
  properties: {
    seq: { type: 'number' },
    outcome: { enum: ['answered', 'failed'] },
    requestId: { type: ['string', 'null'] },
    durationMs: { type: ['number', 'null'] },
    request: { type: ['object', 'null'] },
    systemMessage: { type: ['object', 'null'] },
    conversationLength: { type: ['number', 'null'] },
    messages: { type: ['array', 'null'] },
    response: { type: ['object', 'null'] },
    error: { type: ['object', 'null'] },
    missingParts: { type: 'array', items: { type: 'string' } },
  },
};

const exportSchema = envelope(['exportedAt', 'chat', 'member', 'messages', 'conversation', 'modelCalls'], {
  exportedAt: { type: 'number' },
  chat: storedChatSchema,
  member: reviewMemberSchema,
  messages: { type: 'array', items: storedMessageSchema },
  conversation: { type: 'array' },
  modelCalls: { type: 'array', items: exportedModelCallSchema },
});

module.exports = {
  reviewMembersSchema,
  reviewMemberChatsSchema,
  reviewTranscriptSchema,
  exportSchema,
  configSchema,
  stepRefusalSchema,
  notConfiguredSchema,
  toolCallRecordedSchema,
  listChatsSchema,
  getChatSchema,
  renameChatSchema,
  deleteChatSchema,
  chatNotFoundSchema,
};
