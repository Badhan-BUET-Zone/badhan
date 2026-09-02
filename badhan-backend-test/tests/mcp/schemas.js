// JSON-RPC 2.0 shapes. The MCP endpoint deliberately does not speak the app's
// status/statusCode/message envelope, so these schemas share nothing with tests/lib/schemas.

const jsonRpcResultSchema = (resultSchema) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    jsonrpc: { const: '2.0' },
    id: {},
    result: resultSchema,
  },
  required: ['jsonrpc', 'id', 'result'],
});

const jsonRpcErrorSchema = (code) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    jsonrpc: { const: '2.0' },
    id: {},
    error: {
      type: 'object',
      additionalProperties: false,
      properties: {
        code: code === undefined ? { type: 'integer' } : { const: code },
        message: { type: 'string', minLength: 1 },
        data: {},
      },
      required: ['code', 'message'],
    },
  },
  required: ['jsonrpc', 'id', 'error'],
});

const initializeResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    protocolVersion: { type: 'string', minLength: 1 },
    capabilities: {
      type: 'object',
      additionalProperties: true,
      properties: {
        tools: {
          type: 'object',
          additionalProperties: true,
          properties: { listChanged: { type: 'boolean' } },
          required: ['listChanged'],
        },
      },
      required: ['tools'],
    },
    serverInfo: {
      type: 'object',
      additionalProperties: false,
      properties: { name: { const: 'badhan' }, version: { type: 'string', minLength: 1 } },
      required: ['name', 'version'],
    },
    instructions: { type: 'string', minLength: 1 },
  },
  required: ['protocolVersion', 'capabilities', 'serverInfo', 'instructions'],
};

const toolDefinitionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    inputSchema: {
      type: 'object',
      properties: {
        type: { const: 'object' },
        properties: { type: 'object' },
        required: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'properties'],
    },
    annotations: {
      type: 'object',
      additionalProperties: false,
      properties: {
        readOnlyHint: { type: 'boolean' },
        destructiveHint: { type: 'boolean' },
        idempotentHint: { type: 'boolean' },
      },
      required: ['readOnlyHint', 'destructiveHint', 'idempotentHint'],
    },
  },
  required: ['name', 'title', 'description', 'inputSchema', 'annotations'],
};

const toolsListResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { tools: { type: 'array', minItems: 1, items: toolDefinitionSchema } },
  required: ['tools'],
};

const toolCallResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    content: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { type: { const: 'text' }, text: { type: 'string' } },
        required: ['type', 'text'],
      },
    },
    isError: { type: 'boolean' },
  },
  required: ['content', 'isError'],
};

module.exports = {
  jsonRpcResultSchema,
  jsonRpcErrorSchema,
  initializeResultSchema,
  toolDefinitionSchema,
  toolsListResultSchema,
  toolCallResultSchema,
};
