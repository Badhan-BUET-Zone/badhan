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

describe('docs screenshot — the Feedback page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures a message card as a volunteer sees it', () => {
    cy.viewport(500, 1000);
    clearFeedbacksViaApi();
    createDonorViaApi({ name: 'Rafiqul Islam', studentId: '1905003' }, 'donor');

    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);

    cy.get<FeedbackDonor>('@donor').then((donor) => {
      seedMessageViaApi(donor, 'I donated blood on 12 March 2026, please add it.').then(() => {
        drawer.goToFeedback();

        // Rows arrive collapsed. The message is what the screenshot is about, so open it.
        cy.get('[data-cy="feedbackHeaderName"]').click();
        cy.get('[data-cy="feedbackMessageText"]').should('be.visible');
        hideOverlays();
    cy.wait(1500);
        cy.get('[data-cy="feedbackDonorCard"]').parents('.v-card').first()
          .screenshot('feedback-card');
      });
    });
  });
});
