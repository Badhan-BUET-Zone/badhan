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
  sendMessage,
} from '@support/helpers/agent';

// Call buttons in Badhan Agent's answers. The model writes [[call:<donor _id>]]; the page draws a
// Call button with the name and number from the chat's own API responses. As in turn.cy.ts the
// model's side is scripted, and the request it asks for — GET /donors/me — is real, so the button
// dials a real number and logs a real call record.

const OWN_RECORD = { label: 'Get your own donor record', method: 'GET', path: '/donors/me' };

// A well-formed id that no response in the chat gave.
const UNKNOWN_ID = '5e6b8b3f1c9d440000a1b2c3';

const signInAndOpenNewChat = (): void => {
  new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
  cy.url({ timeout: 20000 }).should('include', '/home');
  cy.visit('/#/agent');
  cy.wait('@config');
  cy.get('[data-cy="agentStartChatButton"]', { timeout: 20000 }).click();
};

describe('a Call button in a Badhan Agent answer', () => {
  beforeEach(() => {
    stubConfig();
    stubChatList([]);
  });

  it('dials the number the API returned and logs the call, as Direct call does', () => {
    const toolMessage = pendingToolMessage(2, 'call_me', OWN_RECORD);
    cy.intercept('POST', '**/agent/chats', ok(201, {
      chat: chatSummary(),
      messages: [userMessage(0, 'Call me'), assistantMessage(1, '', ['call_me']), toolMessage],
      finishReason: 'tool_calls',
    })).as('create');
    const reports = stubToolReports(new Map([['call_me', toolMessage]]));

    // The model's answer names the donor the real response returned, by id.
    const donor: { _id?: string; name?: string; phone?: number } = {};
    cy.intercept('POST', `**/agent/chats/${CHAT_ID}/continue`, (req) => {
      Object.assign(donor, JSON.parse(reports[0].body.response as string).donor);
      req.reply(ok(200, {
        chat: chatSummary(),
        messages: [assistantMessage(3, `Here you are:\n${donor.name} [[call:${donor._id}]]`)],
        finishReason: 'stop',
      }));
    }).as('continue');
    cy.intercept('POST', '**/callrecords').as('callRecord');

    signInAndOpenNewChat();
    // The dialler is a window the page opens; stubbed, so the run stays on the page.
    cy.window().then((win) => cy.stub(win, 'open').as('dialler'));
    sendMessage('Call me');
    cy.wait('@create');
    cy.wait('@report');
    cy.wait('@continue');

    cy.get('[data-cy="agentAssistantMessage"]').last().within(() => {
      cy.contains('Here you are:').should('be.visible');
      // The marker itself is never shown.
      cy.root().should('not.contain', '[[call:');
      cy.get('[data-cy="agentProfileButton"]').should('not.exist');
      cy.get('[data-cy="agentCallButton"]').should('have.length', 1).and('not.be.disabled')
        .then(($button) => expect($button.text().trim()).to.equal(`Call ${donor.name}`));
      cy.get('[data-cy="agentCallButton"]').click();
    });

    // Read once the number is known: a chained expectation would be built before it is.
    cy.get('@dialler').should('have.been.calledOnce').then((open) => {
      const stub = open as unknown as { firstCall: { args: unknown[] } };
      expect(stub.firstCall.args[0]).to.equal(`tel:+${donor.phone}`);
    });
    cy.wait('@callRecord').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ donorId: donor._id });
      expect(response && response.statusCode).to.equal(201);
    });
    cy.contains('Added call record').should('be.visible');
  });

  it('an id no response gave gets See profile instead, and dials nothing', () => {
    cy.intercept('POST', '**/agent/chats', ok(201, {
      chat: chatSummary(),
      messages: [userMessage(0, 'Who is this?'), assistantMessage(1, `Perhaps this donor [[call:${UNKNOWN_ID}]]`)],
      finishReason: 'stop',
    })).as('create');

    signInAndOpenNewChat();
    sendMessage('Who is this?');
    cy.wait('@create');

    cy.get('[data-cy="agentAssistantMessage"]').last().within(() => {
      cy.contains('Perhaps this donor').should('be.visible');
      cy.root().should('not.contain', '[[call:');
      cy.get('[data-cy="agentCallButton"]').should('not.exist');
      cy.get('[data-cy="agentProfileButton"]').should('have.length', 1)
        .and('contain', 'See profile')
        .and('have.attr', 'href').and('include', `/home/details?id=${UNKNOWN_ID}`);
    });
  });
});
