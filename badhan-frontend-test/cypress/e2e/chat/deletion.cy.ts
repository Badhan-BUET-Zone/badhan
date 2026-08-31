import { SignInPage } from '@pages/SignInPage';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  superAdminToken,
  clearMessagesViaApi,
  seedMessageViaApi,
  createVolunteerWithToken,
  VOLUNTEER_PASSWORD,
} from '@support/helpers/chat';

// Who may delete what, and what a delete leaves behind — which is nothing at all.

describe('deleting a message', () => {
  it('a Super Admin sees the affordance on every bubble, including other people\'s', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Deletion Other').then((other) => {
        seedMessageViaApi(other.token, 'written by somebody else');

        // The signed-in account for these specs is a Super Admin, who may delete anyone's.
        new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
        cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
        cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 })
          .find('[data-cy="chatBubbleDeleteButton"]')
          .should('exist');
      });
    });
  });

  it('a Volunteer sees the affordance on their own bubble and on nobody else\'s', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);
      createVolunteerWithToken(adminToken, 'Deletion Author').then((author) => {
        createVolunteerWithToken(adminToken, 'Deletion Bystander').then((bystander) => {
          seedMessageViaApi(bystander.token, 'not the volunteer to remove');

          // Signed in as an ordinary Volunteer this time, not the Super Admin the other specs use.
          new SignInPage().signIn(author.localPhone.replace(/^0/, '0'), VOLUNTEER_PASSWORD);
          cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
          cy.get('[data-cy="chatComposerInput"]').type('mine, and mine to remove');
          cy.get('[data-cy="chatComposerSendButton"]').click();
          cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

          cy.get('[data-cy="chatBubbleOwn"]').find('[data-cy="chatBubbleDeleteButton"]').should('exist');
          // A hall admin has no standing over a room that is not scoped by hall, and neither
          // does a peer. The server enforces this too — a hidden button is not a permission check.
          cy.get('[data-cy="chatBubbleOther"]').find('[data-cy="chatBubbleDeleteButton"]').should('not.exist');
        });
      });
    });
  });

  it('confirming removes the bubble, and the deletion survives a reopen', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);

      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
      cy.get('[data-cy="chatComposerInput"]').type('delete me');
      cy.get('[data-cy="chatComposerSendButton"]').click();
      cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

      cy.get('[data-cy="chatBubbleDeleteButton"]').first().click();
      // Through the existing confirmation box, as the sign-out flow does.
      cy.get('[data-cy="confirmationBoxButtonId"]').click();

      cy.get('[data-cy="chatBubbleOwn"]').should('not.exist');
      // No tombstone, no "message deleted" placeholder — nobody fetching afterwards sees a trace.
      cy.get('[data-cy="chatEmpty"]').should('exist');
    });
  });

  it('a 404 removes the bubble too, because the row is gone either way', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);

      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
      cy.get('[data-cy="chatComposerInput"]').type('somebody else deletes this first');
      cy.get('[data-cy="chatComposerSendButton"]').click();
      cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

      // Two people reaching for the same message is the expected race, not an error.
      cy.intercept('DELETE', '**/messages*', {
        statusCode: 404,
        body: { status: 'ERROR', statusCode: 404, message: 'This message has already been deleted.' },
      }).as('alreadyGone');

      cy.get('[data-cy="chatBubbleDeleteButton"]').first().click();
      cy.get('[data-cy="confirmationBoxButtonId"]').click();
      cy.wait('@alreadyGone');

      cy.get('[data-cy="chatBubbleOwn"]').should('not.exist');
    });
  });

  it('leaves the bubble in place when the delete genuinely fails', () => {
    superAdminToken().then((adminToken) => {
      clearMessagesViaApi(adminToken);

      new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
      cy.get('[data-cy="chatFabId"]', { timeout: 20000 }).click();
      cy.get('[data-cy="chatComposerInput"]').type('this one survives');
      cy.get('[data-cy="chatComposerSendButton"]').click();
      cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');

      cy.intercept('DELETE', '**/messages*', { statusCode: 500, body: { message: 'boom' } }).as('failed');
      cy.get('[data-cy="chatBubbleDeleteButton"]').first().click();
      cy.get('[data-cy="confirmationBoxButtonId"]').click();
      cy.wait('@failed');

      // No optimism: the bubble goes only when the server has agreed.
      cy.get('[data-cy="chatBubbleOwn"]').should('exist');
    });
  });
});
