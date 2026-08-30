import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — in headless Electron the second capture in a file comes out
// blank. Pages fade in, so wait after the element exists or it records at opacity 0.

describe('docs screenshot — the registration QR panel on the Feedback page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the three collapsed panels above the queue', () => {
    cy.viewport(500, 700);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();

    // Collapsed, which is how the page arrives: the generator is the third of three headers, above
    // the queue. Nothing is expanded here — where it is, is the whole point of this capture.
    cy.get('[data-cy="registrationQrPanelHeader"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="registrationQrPanelHeader"]')
      .parents('.v-card')
      .first()
      .screenshot('registration-panel');
  });
});
