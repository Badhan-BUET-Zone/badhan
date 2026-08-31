import { signInWithSeededRoom, openPanel } from './setup';
import { clickDrawerEntry } from '@support/helpers/chat';
import { hideOverlays } from '../hideOverlays';

describe('docs screenshot — the chat page', () => {
  it('captures the full-page view reached from the menu', () => {
    signInWithSeededRoom();
    // Opened and closed once before reaching for the menu. Neither a fresh cy.visit('/#/chat')
    // nor an in-place hash change gets there: both leave the route guard racing profile
    // hydration, and it bounces to /home. Going through the app the way a member does is the
    // only reliable route, and the panel round-trip lets the drawer settle first.
    openPanel();
    cy.get('[data-cy="chatPanelCloseButton"]').click();

    clickDrawerEntry('chatNavigationId');
    cy.hash().should('eq', '#/chat');
    cy.get('[data-cy="chatBubbleOther"]', { timeout: 20000 }).should('have.length', 4);
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('chat-page', { capture: 'viewport', overwrite: true });
  });
});
