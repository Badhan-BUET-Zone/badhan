import { signInWithSeededRoom, openPanel } from './setup';
import { hideOverlays } from '../hideOverlays';

describe('docs screenshot — the chat panel', () => {
  it('captures the conversation as it opens over the current page', () => {
    signInWithSeededRoom();
    openPanel();
    cy.get('[data-cy="chatBubbleOther"]').should('have.length', 4);
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="chatPanel"]').screenshot('chat-panel-open', { overwrite: true });
  });
});
