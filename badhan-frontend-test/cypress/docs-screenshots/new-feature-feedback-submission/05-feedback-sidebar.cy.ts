import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the Feedback entry in the sidebar', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the sidebar carrying the new Feedback entry', () => {
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.open();

    cy.get('[data-cy="feedbackNavigationId"]').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="feedbackNavigationId"]').parents('.v-navigation-drawer').first()
      .screenshot('feedback-sidebar');
  });
});
