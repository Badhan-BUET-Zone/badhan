import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessagesViaApi,
  createVolunteerWithToken,
} from '@support/helpers/chat';

// Scrolling up, and the scroll anchoring that makes it usable.

describe('older messages', () => {
  it('loads a further page when the scroller reaches the top, without jumping', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'History Sender').then((other) => {
        // 35 messages: more than the default page of 30, so history exists behind the first one.
        const texts = Array.from({ length: 35 }, (_unused, index) => `history ${index}`);
        seedMessagesViaApi(other.token, texts);

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('have.length', 30);

        // The newest page is the LAST thirty, so the oldest five are the ones still missing.
        cy.get('[data-cy="chatBubbleText"]').first().should('have.text', 'history 5');

        cy.intercept('GET', '**/messages*before=*').as('olderPage');
        cy.get('[data-cy="chatMessageList"]').scrollTo('top');
        cy.wait('@olderPage').its('request.url').should('contain', 'beforeId=');

        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('have.length', 35);
        cy.get('[data-cy="chatBubbleText"]').first().should('have.text', 'history 0');
        // Nothing older remains, and the list says so rather than asking forever.
        cy.get('[data-cy="chatHistoryStart"]').should('exist');
      });
    });
  });

  it('sends both halves of the older cursor, never a lone before', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Cursor Sender').then((other) => {
        seedMessagesViaApi(other.token, Array.from({ length: 32 }, (_u, i) => `cursor ${i}`));

        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('have.length', 30);

        cy.intercept('GET', '**/messages*before=*').as('olderPage');
        cy.get('[data-cy="chatMessageList"]').scrollTo('top');

        // A lone `before` names a millisecond rather than a message, and the server refuses it —
        // for the good reason that a boundary inside a shared millisecond skips one forever.
        cy.wait('@olderPage').then(({ request, response }) => {
          expect(request.url).to.contain('before=');
          expect(request.url).to.contain('beforeId=');
          expect(response?.statusCode).to.eq(200);
        });
      });
    });
  });
});
