import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// Full-screen mode is the projector case: the whole point is that nothing but the code is on the
// screen, so a viewport capture is the honest one here.

describe('docs screenshot — the code in full-screen mode', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the projector view with the app chrome gone', () => {
    cy.viewport(900, 650);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="registrationQrFullScreenButton"]').should('be.visible').click();
    cy.get('[data-cy="registrationQrFullScreenArtwork"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-fullscreen', { capture: 'viewport' });
  });
});
