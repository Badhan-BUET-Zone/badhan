import { signInWithSeededRoom, openPanel } from './setup';
import { hideOverlays } from '../hideOverlays';

describe('docs screenshot — the delete confirmation', () => {
  it('captures the confirmation that a delete cannot be undone', () => {
    signInWithSeededRoom();
    openPanel();
    cy.get('[data-cy="chatComposerInput"]').type('Camp wrapped up, 34 donors registered');
    cy.get('[data-cy="chatComposerSendButton"]').click();
    cy.get('[data-cy="chatBubbleOwn"]', { timeout: 20000 }).should('exist');
    cy.get('[data-cy="chatBubbleOwn"]').find('[data-cy="chatBubbleDeleteButton"]').first().click();
    cy.get('[data-cy="confirmationBoxButtonId"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('chat-delete-confirm', { capture: 'viewport', overwrite: true });
  });
});
