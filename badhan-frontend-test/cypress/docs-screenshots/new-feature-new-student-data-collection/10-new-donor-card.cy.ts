import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import {
  clearFeedbacksViaApi,
  createDonorViaApi,
  seedRegistrationViaApi,
  FeedbackDonor,
} from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.

describe('docs screenshot — a New donor submission card', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the card a volunteer works from', () => {
    // Wide enough that the rows stay single-line; a narrow frame makes the table outgrow the
    // height Cypress can capture in one shot.
    cy.viewport(720, 900);
    clearFeedbacksViaApi();
    createDonorViaApi({ name: 'Token Minter', studentId: '1905110' }, 'minter');

    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: 'Sadia Afrin',
        studentId: '1905111',
        roomNumber: '404',
        address: 'Palashi',
        comment: 'I am new here.',
      }).then(() => {
        drawer.goToFeedback();

        // Rows arrive collapsed; the submitted fields are the point of this capture.
        cy.get('[data-cy="feedbackNewDonorCard"]').should('be.visible');
        cy.get('[data-cy="feedbackHeaderName"]').click();
        cy.get('[data-cy="feedbackCreateDonorButton"]').should('be.visible');
        cy.get('[data-cy="feedbackNewDonorStudentId"]').should('be.visible');
        hideOverlays();
        cy.wait(1500);
        cy.get('[data-cy="feedbackNewDonorCard"]').parents('.v-card').first()
          .screenshot('registration-new-donor-card');
      });
    });
  });
});
