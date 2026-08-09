import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the printable QR panel on the Feedback page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the expanded panel with the sheet preview and the download button', () => {
    // Narrow, so the A4-portrait preview is short enough that the whole panel — sheet, link and
    // download button — fits in one frame. The headless window caps out around 900px tall, so
    // widening the viewport makes the preview taller and pushes the button out of the shot.
    cy.viewport(370, 900);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();

    cy.get('[data-cy="feedbackQrPanelHeader"]').click();
    cy.get('[data-cy="feedbackQrCode"]').should('exist');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="feedbackQrPanel"]').screenshot('feedback-qr-panel');
  });
});
