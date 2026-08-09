import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — in headless Electron the second capture in a file comes out
// blank. Pages fade in, so wait after the element exists or it records at opacity 0.

describe('docs screenshot — Donor Registration QR in the sidebar', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the entry nested under Donor Creation', () => {
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.open();
    // It sits inside the Donor Creation group, so the group has to be open for it to be on screen.
    cy.get('[data-cy="donorCreationNavigationId"]').click();

    cy.get('[data-cy="registrationQrNavigationId"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationQrNavigationId"]').parents('.v-navigation-drawer').first()
      .screenshot('registration-sidebar');
  });
});
