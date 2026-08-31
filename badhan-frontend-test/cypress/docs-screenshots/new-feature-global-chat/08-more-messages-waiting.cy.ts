import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { superAdminToken, clearMessagesViaApi } from '@support/helpers/chat';
import { hideOverlays } from '../hideOverlays';

// A full catch-up page is stubbed rather than seeded: producing a genuine backlog of more than
// thirty would take a minute of sequential sends for a picture of a label.

const sender = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Nusrat Jahan', studentId: '2105011', hall: 6, designation: 1 };
const SERVER_TIME = Date.now() - 3 * 60 * 60 * 1000;

describe('docs screenshot — More messages waiting', () => {
  it('captures the button telling a returning member the catch-up is not finished', () => {
    superAdminToken().then(clearMessagesViaApi);
    new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).should('be.visible');

    cy.intercept('GET', '**/messages*', {
      statusCode: 200,
      body: {
        status: 'OK',
        statusCode: 200,
        message: 'Messages fetched successfully',
        messages: Array.from({ length: 30 }, (_unused, index) => ({
          _id: `docs${String(index).padStart(3, '0')}`,
          text: `Message ${index + 1} from while you were away`,
          date: SERVER_TIME - (29 - index) * 1000,
          sender,
        })),
        serverTime: SERVER_TIME,
        hasMore: true,
      },
    }).as('truncated');

    cy.get('[data-cy="chatFabId"]').click();
    cy.get('[data-cy="chatFetchMessagesButton"]').click();
    cy.wait('@truncated');
    cy.get('[data-cy="chatFetchMessagesButton"]').should('contain.text', 'More messages waiting');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="chatPanel"]').screenshot('chat-more-messages-waiting', { overwrite: true });
  });
});
