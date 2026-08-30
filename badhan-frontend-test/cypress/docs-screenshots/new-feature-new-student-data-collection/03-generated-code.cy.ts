import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — a generated registration code', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the code under its expiry line', () => {
    // Tall enough for the expiry line and the whole sheet beneath it — the artwork is
    // A4-proportioned, so it is about 1.4x as tall as the container is wide.
    cy.viewport(500, 900);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    // The expiry line sits ABOVE the artwork and the buttons sit below it, so no single frame holds
    // both. This one is anchored on the expiry; 12-generated-link.cy.ts captures the other end.
    // The offset keeps the line clear of the fixed app bar; scrollIntoView on its own puts it at
    // y=0, underneath it, and the capture then shows a half-eaten sentence.
    cy.get('[data-cy="registrationQrExpiry"]')
      .should('be.visible')
      .scrollIntoView({ offset: { top: -100, left: 0 } });
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-generated-code', { capture: 'viewport' });
  });
});
