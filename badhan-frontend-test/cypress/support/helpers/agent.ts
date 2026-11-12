// Badhan Agent specs. The local backend has no OpenAI key — and a test run must not spend money —
// so every /agent route a turn touches is answered by cy.intercept, which is how these specs script
// what the model "says". The API calls the model asks for are NOT stubbed: the page sends them to
// the real local backend with the signed-in member's own token, exactly as it would in use.

const NOW = Date.now();

export const CHAT_ID = 'a9e000000000000000000001';

export const chatSummary = (overrides: Record<string, unknown> = {}) => ({
  _id: CHAT_ID,
  title: 'Who am I signed in as?',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

export const userMessage = (seq: number, content: string) => ({
  _id: `m${seq}`,
  seq,
  role: 'user',
  content,
  createdAt: NOW,
});

export const toolCall = (id: string, name = 'SomeTool') => ({
  id,
  type: 'function',
  function: { name, arguments: '{}' },
});

export const assistantMessage = (seq: number, content: string, toolCallIds: string[] = []) => ({
  _id: `m${seq}`,
  seq,
  role: 'assistant',
  content,
  openaiModel: 'gpt-6-luna',
  usage: { prompt_tokens: 1200, completion_tokens: 30 },
  createdAt: NOW,
  ...(toolCallIds.length ? { toolCalls: toolCallIds.map((id) => toolCall(id)) } : {}),
});

export interface ToolSpec {
  label: string;
  method: string;
  path: string;
  body?: unknown;
}

export const pendingToolMessage = (seq: number, toolCallId: string, tool: ToolSpec) => ({
  _id: `m${seq}`,
  seq,
  role: 'tool',
  toolCallId,
  content: '',
  createdAt: NOW,
  run: {
    status: 'pending',
    name: 'SomeTool',
    label: tool.label,
    method: tool.method,
    path: tool.path,
    args: {},
    body: tool.body === undefined ? null : tool.body,
    isWrite: tool.method !== 'GET',
    httpStatus: null,
    durationMs: null,
    response: null,
    note: null,
  },
});

// A route's success envelope, as the backend wraps every answer.
export const ok = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  body: { status: 'OK', statusCode, message: 'OK', ...body },
});

export const stubConfig = (overrides: Record<string, unknown> = {}) =>
  cy
    .intercept('GET', '**/agent/config', ok(200, { configured: true, model: 'gpt-6-luna', toolCount: 49, ...overrides }))
    .as('config');

export const stubChatList = (chats: unknown[]) => cy.intercept('GET', '**/agent/chats', ok(200, { chats })).as('chatList');

/**
 * Answers every result report the way the backend does: the stored tool message, with what the
 * page reported folded into its run. Every report is kept, in order, for the spec to inspect.
 */
export const stubToolReports = (toolMessages: Map<string, ReturnType<typeof pendingToolMessage>>) => {
  const reports: Array<{ toolCallId: string; body: Record<string, unknown> }> = [];
  cy.intercept('PUT', '**/agent/chats/*/toolCalls/*', (req) => {
    const toolCallId = decodeURIComponent(req.url.split('/').pop() as string);
    const body = req.body as Record<string, unknown>;
    reports.push({ toolCallId, body });
    const stored = toolMessages.get(toolCallId);
    req.reply(
      ok(200, {
        toolMessage: {
          ...stored,
          content: JSON.stringify({ httpStatus: body.httpStatus ?? null }),
          run: {
            ...(stored as { run: object }).run,
            status: body.status,
            httpStatus: body.httpStatus ?? null,
            durationMs: body.durationMs ?? null,
            response: body.response ?? null,
            note: body.note ?? null,
          },
        },
      })
    );
  }).as('report');
  return reports;
};

// The page, opened from the menu as a member would.
export const openAgentFromMenu = (): void => {
  cy.get('[data-cy="hamburgerButtonId"]').click();
  cy.get('[data-cy="agentNavigationId"]', { timeout: 20000 }).click({ force: true });
  cy.url().should('include', '/agent');
};

export const composer = () => cy.get('[data-cy="agentInput"]');

export const sendMessage = (text: string): void => {
  composer().type(`${text}{enter}`);
};
