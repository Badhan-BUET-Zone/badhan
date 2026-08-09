import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.
//
// The bottom of the QR panel. It needs its own capture because the A4-portrait preview above it is
// taller than the headless window, so a screenshot of the whole panel clips the link and the
// download button off the end.

describe('docs screenshot — the QR panel’s link and download button', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the shareable link and the Download PDF button', () => {
    cy.viewport(500, 650);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();

    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrDownloadButton"]').should('be.visible').scrollIntoView();
    hideOverlays();
    cy.wait(1500);
    // capture: 'viewport' rather than the default full-page stitch: the app bar is sticky, so a
    // stitched capture repeats it once per scroll step and reads as a rendering bug.
    cy.screenshot('feedback-qr-download', { capture: 'viewport' });
  });
});
