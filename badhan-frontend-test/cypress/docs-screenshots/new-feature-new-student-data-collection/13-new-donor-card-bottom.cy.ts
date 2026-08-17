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
//
// The bottom of the New donor submission card. It needs its own capture because the card runs to
// thirteen table rows plus two buttons — taller than the frame Cypress can take in one shot. This
// half carries the "as reported by the student" heading, which is the part a volunteer must not
// read as a Badhan record.

describe('docs screenshot — the reported donation history and the card’s buttons', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the reported history heading, Create donor and Discard', () => {
    cy.viewport(720, 500);
    clearFeedbacksViaApi();
    createDonorViaApi({ name: 'Token Minter', studentId: '1905114' }, 'minter');

    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: 'Sadia Afrin',
        studentId: '1905115',
        roomNumber: '404',
        address: 'Palashi',
        comment: 'I am new here.',
      }).then(() => {
        drawer.goToFeedback();

        cy.get('[data-cy="feedbackNewDonorCard"]').should('be.visible');
        cy.get('[data-cy="feedbackHeaderName"]').click();
        cy.contains('.v-card__subtitle', 'Donation history, as reported by the student')
          .should('be.visible')
          .scrollIntoView();
        hideOverlays();
        cy.wait(1500);
        cy.screenshot('registration-new-donor-card-actions', { capture: 'viewport' });
      });
    });
  });
});
