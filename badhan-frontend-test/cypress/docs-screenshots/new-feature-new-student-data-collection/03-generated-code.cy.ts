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

  it('captures the code and the sheet under it', () => {
    // Tall enough for the whole sheet — the artwork is A4-proportioned, so it is about 1.4x as
    // tall as the container is wide.
    cy.viewport(500, 900);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    // The sheet and the buttons below it do not fit one frame, so this one is anchored on the
    // artwork and 12-generated-link.cy.ts captures the other end. The offset keeps the top of the
    // sheet clear of the fixed app bar; scrollIntoView on its own puts it at y=0, underneath it.
    cy.get('[data-cy="feedbackQrArtwork"]', { timeout: 20000 })
      .should('be.visible')
      .scrollIntoView({ offset: { top: -100, left: 0 } });
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-generated-code', { capture: 'viewport' });
  });
});
