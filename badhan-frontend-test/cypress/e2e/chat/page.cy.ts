import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessagesViaApi,
  createVolunteerWithToken,
  clickDrawerEntry,
} from '@support/helpers/chat';

// The page behind the drawer entry. Same store, same components — only more room.

describe('the chat page', () => {
  it('is reached from the drawer and shows the same messages as the panel', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Page Sender').then((other) => {
        seedMessagesViaApi(other.token, ['visible in both places']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('have.length', 1);
        cy.get('[data-cy="chatPanelCloseButton"]').click();

        clickDrawerEntry('chatNavigationId');
        cy.hash().should('eq', '#/chat');

        // One store backs both, so the page needs no fetch of its own to be populated.
        cy.get('[data-cy="chatBubbleOther"]').should('have.length', 1);
        cy.get('[data-cy="chatBubbleText"]').should('have.text', 'visible in both places');
        // Same composer, same fetch control.
        cy.get('[data-cy="chatComposerInput"]').should('exist');
        cy.get('[data-cy="chatFetchMessagesButton"]').should('exist');
      });
    });
  });

  it('marks everything read on mount, exactly as opening the panel does', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Page Badge Sender').then((other) => {
        seedMessagesViaApi(other.token, ['unread until the page opens']);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabBadge"] .v-badge__badge', { timeout: 20000 }).should('have.text', '1');

        clickDrawerEntry('chatNavigationId');
        cy.hash().should('eq', '#/chat');
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('exist');

        // Leaving the page, the button is back and its badge is clear.
        clickDrawerEntry('homeNavigationId');
        cy.hash().should('eq', '#/home');
        cy.get('[data-cy="chatFabBadge"] .v-badge__badge').should('not.be.visible');
      });
    });
  });

  it('sends from the page as well as from the panel', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);

      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      clickDrawerEntry('chatNavigationId');
      cy.hash().should('eq', '#/chat');

      cy.get('[data-cy="chatComposerInput"]').type('sent from the page');
      cy.get('[data-cy="chatComposerSendButton"]').click();
      cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('contain.text', 'sent from the page');
    });
  });
});
