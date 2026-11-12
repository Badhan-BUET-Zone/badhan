import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { superAdminToken, createVolunteerWithToken, VOLUNTEER_PASSWORD } from '@support/helpers/chat';
import {
  CHAT_ID,
  chatSummary,
  userMessage,
  assistantMessage,
  ok,
  stubConfig,
  stubChatList,
  openAgentFromMenu,
  composer,
} from '@support/helpers/agent';

// The Badhan Agent page around a turn: who can reach it, what they see, and what it no longer has.

const NOT_SET_UP = 'The agent is not set up on this server yet. Ask a super admin.';

describe('Badhan Agent page', () => {
  it('a volunteer finds it at the top of the menu; no Settings, no system prompt, no example chips', () => {
    superAdminToken().then((adminToken) => {
      createVolunteerWithToken(adminToken, 'Agent Volunteer').then((volunteer) => {
        new SignInPage().signIn(volunteer.localPhone, VOLUNTEER_PASSWORD);
        cy.url({ timeout: 20000 }).should('include', '/home');

        openAgentFromMenu();
        cy.get('[data-cy="agentPage"]').should('be.visible');
        // A top-level entry, not under Super Admin, which a volunteer does not have at all.
        cy.get('[data-cy="superAdminId"]').should('not.exist');

        // A first visit has no chats, and the page does not make one by itself.
        cy.get('[data-cy="agentChatListItem"]').should('not.exist');
        cy.get('[data-cy="agentStartChatButton"]').click();

        cy.get('[data-cy="agentEmptyHint"]').should('be.visible');
        cy.get('[data-cy="agentSettingsButton"]').should('not.exist');
        cy.get('[data-cy="agentSystemPromptPanel"]').should('not.exist');
        cy.get('[data-cy="agentPage"] .v-chip').should('not.exist');
      });
    });
  });

  it('shows no system prompt, even to a super admin: that is on Agent Chats', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.visit('/#/agent');

    cy.get('[data-cy="agentStartChatButton"]', { timeout: 20000 }).click();
    cy.get('[data-cy="agentEmptyHint"]').should('be.visible');
    cy.get('[data-cy="agentSystemPromptPanel"]').should('not.exist');
    cy.contains('System prompt').should('not.exist');
  });

  it('with no key on the server, says the agent is not set up and will not send', () => {
    // Stubbed rather than read from the local backend, so the spec does not depend on whether
    // someone has put a key in env.local to try the agent.
    stubConfig({ configured: false });
    stubChatList([]);
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.visit('/#/agent');

    cy.get('[data-cy="agentStartChatButton"]', { timeout: 20000 }).click();
    cy.get('[data-cy="agentComposerNote"]').should('contain', NOT_SET_UP);
    composer().should('have.attr', 'placeholder', NOT_SET_UP).type('Hello');
    cy.get('[data-cy="agentSendButton"]').should('be.disabled');
  });

  it('removes a saved OpenAI key left over from the old page', () => {
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.window().then((win) => {
      win.localStorage.setItem('badhan-agent:settings', JSON.stringify({ verifiedApiKey: 'sk-left-behind', approval: 'writes', maxSteps: 20 }));
    });

    cy.visit('/#/agent');
    cy.get('[data-cy="agentPage"]').should('be.visible');
    cy.window().its('localStorage').invoke('getItem', 'badhan-agent:settings').should('be.null');
  });

  it('deleting a chat removes it from the list, with the usual confirmation', () => {
    const other = chatSummary({ _id: 'a9e000000000000000000002', title: 'Kept chat' });
    stubConfig();
    stubChatList([chatSummary({ title: 'Chat to delete' }), other]);
    cy.intercept('GET', `**/agent/chats/${CHAT_ID}`, ok(200, {
      chat: chatSummary(),
      messages: [userMessage(0, 'Hello'), assistantMessage(1, 'Hello! What do you need?')],
    }));
    cy.intercept('GET', `**/agent/chats/${other._id}`, ok(200, { chat: other, messages: [] }));
    cy.intercept('DELETE', `**/agent/chats/${CHAT_ID}`, ok(200, {})).as('deleteChat');

    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.visit('/#/agent');

    // The newest chat opens by itself.
    cy.get('[data-cy="agentUserMessage"]', { timeout: 20000 }).should('contain', 'Hello');
    cy.get('[data-cy="agentChatsButton"]').click();
    cy.get('[data-cy="agentChatListItem"]').should('have.length', 2).first().within(() => {
      cy.get('[data-cy="agentDeleteChatButton"]').click({ force: true });
    });
    cy.contains('Delete "Chat to delete"? This cannot be undone.').should('be.visible');
    cy.get('[data-cy="confirmationBoxButtonId"]').click();

    cy.wait('@deleteChat');
    cy.get('[data-cy="agentChatListItem"]').should('have.length', 1).and('contain', 'Kept chat');
  });
});
