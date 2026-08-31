import { signInWithSeededRoom } from './setup';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot.
// ONE cy.screenshot() per spec file — in headless Electron the second capture in a file is blank.

describe('docs screenshot — the floating button and its unread badge', () => {
  it('captures the round button with messages waiting', () => {
    signInWithSeededRoom();
    // Four seeded messages, none of them read: the badge is the point of this picture.
    cy.get('[data-cy="chatFabBadge"] .v-badge__badge').should('be.visible').and('have.text', '4');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('chat-fab-badge', { capture: 'viewport', overwrite: true });
  });
});
