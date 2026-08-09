import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  clearFeedbacksViaApi,
  createDonorViaApi,
  seedMessageViaApi,
  FeedbackDonor,
} from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Throwaway spec: captures a documentation screenshot for docs/blog.
// ONE cy.screenshot() per spec file — see 01-public-donor-form.cy.ts.

describe('docs screenshot — the Discard confirmation', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the wording shown before a message is deleted', () => {
    cy.viewport(700, 500);
    clearFeedbacksViaApi();
    createDonorViaApi({ name: 'Rafiqul Islam', studentId: '1905004' }, 'donor');

    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'I donated blood on 12 March 2026, please add it.').then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackDiscardButton"]').click();
        cy.get('[data-cy="confirmationBoxButtonId"]').should('be.visible');
        hideOverlays();
    cy.wait(1500);
        cy.get('[data-cy="confirmationBoxButtonId"]').parents('.v-card').first()
          .screenshot('feedback-discard-confirmation');
      });
    });
  });
});
