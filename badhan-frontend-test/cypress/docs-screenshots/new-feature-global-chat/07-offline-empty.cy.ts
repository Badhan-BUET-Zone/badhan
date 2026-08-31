import { superAdminToken, clearMessagesViaApi } from '@support/helpers/chat';
import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// The picture the manual needs most: with no connection the chat is EMPTY, and that is not lost
// messages. Simulated by failing the fetch rather than by taking the machine offline.

describe('docs screenshot — the chat with no connection', () => {
  it('captures the empty conversation a member sees offline', () => {
    superAdminToken().then(clearMessagesViaApi);
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('GET', '**/messages*', { forceNetworkError: true }).as('offline');
    cy.get('[data-cy="chatFabId"]').click();
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.get('[data-cy="chatEmpty"]', { timeout: 20000 }).should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="chatPanel"]').screenshot('chat-offline-empty', { overwrite: true });
  });
});
