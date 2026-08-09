import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — a generated registration code', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the code under its expiry line', () => {
    cy.viewport(500, 800);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToRegistrationQr();

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    // The expiry line sits ABOVE the artwork and the buttons sit below it, so no single frame holds
    // both. This one is anchored on the expiry; 12-generated-link.cy.ts captures the other end.
    cy.get('[data-cy="registrationQrExpiry"]').should('be.visible').scrollIntoView();
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-generated-code', { capture: 'viewport' });
  });
});
