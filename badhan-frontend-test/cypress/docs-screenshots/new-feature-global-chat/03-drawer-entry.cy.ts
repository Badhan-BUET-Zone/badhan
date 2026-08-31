import { NavigationDrawer } from '@pages/NavigationDrawer';
import { signInWithSeededRoom } from './setup';
import { hideOverlays } from '../hideOverlays';

describe('docs screenshot — the Messages entry in the menu', () => {
  it('captures the drawer with Messages sitting under Home', () => {
    signInWithSeededRoom();
    new NavigationDrawer().ensureOpen();
    cy.get('[data-cy="chatNavigationId"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('.v-navigation-drawer').screenshot('chat-drawer-entry', { overwrite: true });
  });
});
