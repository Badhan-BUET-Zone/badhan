import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The other end of the generated code: the link, the warning that the link IS the credential, and
// the two buttons. The expiry line is above the artwork and cannot share a frame with these.

describe('docs screenshot — the generated code’s link and buttons', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the link warning, Full Screen and Download PDF', () => {
    cy.viewport(500, 500);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrGenerateButton"]').click();
    cy.get('[data-cy="registrationQrDownloadButton"]').should('be.visible').scrollIntoView();
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-generated-link', { capture: 'viewport' });
  });
});
