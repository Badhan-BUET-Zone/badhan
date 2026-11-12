import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  CHAT_ID,
  chatSummary,
  userMessage,
  assistantMessage,
  pendingToolMessage,
  ok,
  stubConfig,
  stubChatList,
  stubToolReports,
  composer,
  sendMessage,
} from '@support/helpers/agent';

// One turn of Badhan Agent, with the model's side scripted through cy.intercept on the /agent
// routes. The requests the model asks for are real: the page sends them to the local backend with
// the super admin's own token.

const LOGINS = { label: 'List the devices you are signed in on', method: 'GET', path: '/users/logins' };
const ADD_CONTACT = {
  label: 'Add a public contact',
  method: 'POST',
  path: '/publicContacts',
  // A donor that does not exist, so even a sent request changes nothing.
  body: { donorId: '5e6b8b3f1c9d440000a1b2c3', bloodGroup: 2 },
};

const signInAndOpenNewChat = (): void => {
  new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
  cy.url({ timeout: 20000 }).should('include', '/home');
  cy.visit('/#/agent');
  cy.wait('@config');
  cy.get('[data-cy="agentStartChatButton"]', { timeout: 20000 }).click();
};

// The first step of a new chat: the member's message, an answer that asks for one call, the call.
const firstStep = (toolCallId: string, tool: Parameters<typeof pendingToolMessage>[2]) => {
  const toolMessage = pendingToolMessage(2, toolCallId, tool);
  return {
    toolMessage,
    response: ok(201, {
      chat: chatSummary(),
      messages: [userMessage(0, 'Help me'), assistantMessage(1, 'On it.', [toolCallId]), toolMessage],
      finishReason: 'tool_calls',
    }),
  };
};

const finalStep = (seq: number, text: string) =>
  ok(200, { chat: chatSummary(), messages: [assistantMessage(seq, text)], finishReason: 'stop' });

describe('a Badhan Agent turn', () => {
  beforeEach(() => {
    stubConfig();
    stubChatList([]);
  });

  it('runs a GET on its own; the card shows its label, and the URL only when opened', () => {
    const { toolMessage, response } = firstStep('call_get', LOGINS);
    cy.intercept('POST', '**/agent/chats', response).as('create');
    const reports = stubToolReports(new Map([['call_get', toolMessage]]));
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/continue`, finalStep(3, 'You are signed in on one device.')).as('continue');

    signInAndOpenNewChat();
    sendMessage('Help me');

    cy.wait('@create').its('request.body').should('deep.equal', { content: 'Help me' });
    cy.wait('@report');
    cy.wait('@continue');
    cy.contains('You are signed in on one device.').should('be.visible');
    // Members are not shown the model or the token counts; only the review page is.
    cy.get('[data-cy="agentUsage"]').should('not.exist');
    // Nor the model's name or the number of tools, though /agent/config sends both.
    cy.get('[data-cy="agentComposerNote"]').should('contain', 'Enter to send').and('not.contain', 'gpt-6-luna');
    cy.get('[data-cy="agentPage"] .mdi-tools').should('not.exist');
    cy.get('[data-cy="agentPage"]').should('not.contain', '49');

    // Ran without asking, against the real backend, and reported as done.
    cy.wrap(reports).should('have.length', 1);
    cy.wrap(reports).its(0).its('body').should((body: Record<string, unknown>) => {
      expect(body.status).to.equal('done');
      expect(body.httpStatus).to.equal(200);
      expect(body.response).to.be.a('string').and.contain('"status": "OK"');
    });
    cy.get('[data-cy="agentApproval"]').should('not.exist');

    // The heading is the label, never the URL.
    cy.get('[data-cy="agentToolCard"]').should('have.length', 1).within(() => {
      cy.get('[data-cy="agentToolLabel"]').should('have.text', LOGINS.label);
      cy.get('[data-cy="agentToolCardHead"]').should('not.contain', '/users/logins');
      cy.get('[data-cy="agentToolStatus"]').should('contain', '200');
      cy.get('[data-cy="agentToolBody"]').should('not.exist');

      cy.get('[data-cy="agentToolCardHead"]').click();
      cy.get('[data-cy="agentToolRequest"]').should('contain', 'GET http').and('contain', '/users/logins');
      cy.get('[data-cy="agentToolBody"]').should('contain', 'Arguments').and('contain', 'Status');
      cy.get('[data-cy="agentToolResponse"]').should('contain', '"status": "OK"');
    });
  });

  it('holds a write, collapsed, until Approve — and opening it shows what would be sent', () => {
    const { toolMessage, response } = firstStep('call_post', ADD_CONTACT);
    cy.intercept('POST', '**/agent/chats', response).as('create');
    const reports = stubToolReports(new Map([['call_post', toolMessage]]));
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/continue`, finalStep(3, 'That donor does not exist.')).as('continue');
    cy.intercept('POST', '**/publicContacts').as('addContact');

    signInAndOpenNewChat();
    sendMessage('Help me');
    cy.wait('@create');

    cy.get('[data-cy="agentToolCard"]').within(() => {
      cy.get('[data-cy="agentToolStatus"]').should('contain', 'needs approval');
      cy.get('[data-cy="agentApproval"]').within(() => {
        cy.get('[data-cy="agentApproveButton"]').should('be.visible');
        cy.get('[data-cy="agentDeclineButton"]').should('be.visible');
      });
      // Collapsed like any other card: it does not open itself.
      cy.get('[data-cy="agentToolBody"]').should('not.exist');
      cy.get('[data-cy="agentToolCardHead"]').click();
      cy.get('[data-cy="agentToolRequest"]').should('contain', 'POST').and('contain', '/publicContacts');
      cy.get('[data-cy="agentToolBody"]').should('contain', 'Request body').and('contain', '5e6b8b3f1c9d440000a1b2c3');
    });
    // Nothing has been sent while it waits.
    cy.get('@addContact.all').should('have.length', 0);

    cy.get('[data-cy="agentApproveButton"]').click();
    cy.wait('@addContact').its('request.body').should('deep.equal', ADD_CONTACT.body);
    cy.wait('@report');
    cy.wait('@continue');
    cy.contains('That donor does not exist.').should('be.visible');
    cy.wrap(reports).its(0).its('body').its('status').should('equal', 'done');
  });

  it('Decline sends nothing and reports the call as denied', () => {
    const { toolMessage, response } = firstStep('call_post', ADD_CONTACT);
    cy.intercept('POST', '**/agent/chats', response).as('create');
    const reports = stubToolReports(new Map([['call_post', toolMessage]]));
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/continue`, finalStep(3, 'Understood, I will not add it.')).as('continue');
    cy.intercept('POST', '**/publicContacts').as('addContact');

    signInAndOpenNewChat();
    sendMessage('Help me');
    cy.wait('@create');

    cy.get('[data-cy="agentDeclineButton"]').click();
    cy.wait('@report');
    cy.wait('@continue');
    cy.contains('Understood, I will not add it.').should('be.visible');
    cy.get('[data-cy="agentToolStatus"]').should('contain', 'declined');
    cy.get('@addContact.all').should('have.length', 0);
    cy.wrap(reports).should('deep.equal', [{ toolCallId: 'call_post', body: { status: 'denied' } }]);
  });

  it('stops by itself after 20 model calls in one turn, and says so', () => {
    // A model that never stops asking for one more lookup.
    const toolMessages = new Map<string, ReturnType<typeof pendingToolMessage>>();
    let seq = 0;
    let calls = 0;
    const step = (statusCode: number, withUserMessage: boolean) => {
      calls += 1;
      const id = `call_${calls}`;
      const messages: unknown[] = [];
      if (withUserMessage) messages.push(userMessage(seq++, 'Keep going'));
      messages.push(assistantMessage(seq++, '', [id]));
      const toolMessage = pendingToolMessage(seq++, id, LOGINS);
      toolMessages.set(id, toolMessage);
      messages.push(toolMessage);
      return ok(statusCode, { chat: chatSummary(), messages, finishReason: 'tool_calls' });
    };
    cy.intercept('POST', '**/agent/chats', (req) => req.reply(step(201, true))).as('create');
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/continue`, (req) => req.reply(step(200, false))).as('continue');
    stubToolReports(toolMessages);

    signInAndOpenNewChat();
    sendMessage('Keep going');

    cy.get('[data-cy="agentNotice"]', { timeout: 60000 })
      .should('contain', 'Stopped after 20 model calls for one message. Send a message to carry on.');
    // The first call, then nineteen continues: twenty model calls, and not a twenty-first.
    cy.get('@continue.all').should('have.length', 19);
    cy.get('[data-cy="agentToolCard"]').should('have.length', 20);
    cy.get('[data-cy="agentStopButton"]').should('not.exist');
  });

  it('a chat busy in another tab says so, with Retry', () => {
    stubChatList([chatSummary()]);
    cy.intercept('GET', `**/agent/chats/${CHAT_ID}`, ok(200, {
      chat: chatSummary(),
      messages: [userMessage(0, 'Hello'), assistantMessage(1, 'Hello! What do you need?')],
    }));
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/messages`, {
      statusCode: 409,
      body: { status: 'ERROR', statusCode: 409, message: 'This chat is busy in another tab or window.', reason: 'busy' },
    }).as('message');

    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.visit('/#/agent');
    cy.get('[data-cy="agentUserMessage"]', { timeout: 20000 }).should('contain', 'Hello');

    composer().should('not.have.attr', 'placeholder', 'Loading…');
    sendMessage('Are you there?');
    cy.wait('@message');
    cy.get('[data-cy="agentNotice"]').should('contain', 'This chat is busy in another tab or window.');
    cy.get('[data-cy="agentRetryButton"]').should('be.visible');
  });
});
