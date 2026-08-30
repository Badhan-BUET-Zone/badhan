import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — the registration QR generator, before generating', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the hall line, the duration selector and the cannot-be-cancelled warning', () => {
    cy.viewport(500, 700);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrGenerateButton"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-generator-form', { capture: 'viewport' });
  });
});
