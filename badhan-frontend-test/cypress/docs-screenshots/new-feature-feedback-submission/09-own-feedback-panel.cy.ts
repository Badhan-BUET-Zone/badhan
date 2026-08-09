import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — sending a message about yourself', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the panel a signed-in member uses to file their own message', () => {
    cy.viewport(600, 800);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();

    cy.get('[data-cy="ownFeedbackPanelHeader"]').click();
    cy.get('[data-cy="ownFeedbackInput"]').should('be.visible')
      .type('I donated blood yesterday at the hall camp.');
    hideOverlays();
    cy.wait(1500);
    cy.get('[data-cy="ownFeedbackPanel"]').screenshot('feedback-own-message-panel');
  });
});
