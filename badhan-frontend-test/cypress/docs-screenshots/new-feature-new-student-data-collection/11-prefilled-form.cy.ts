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
// Create donor opens the ordinary donor-creation form already filled in. Showing it is the point:
// there is no new page for a volunteer to learn.

describe('docs screenshot — the prefilled donor creation form', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the familiar form arriving already filled in', () => {
    cy.viewport(500, 900);
    clearFeedbacksViaApi();
    createDonorViaApi({ name: 'Token Minter', studentId: '1905112' }, 'minter');

    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);

    cy.get<FeedbackDonor>('@minter').then((minter) => {
      seedRegistrationViaApi(minter, {
        name: 'Sadia Afrin',
        studentId: '1905113',
        roomNumber: '404',
        address: 'Palashi',
        comment: 'I am new here.',
      }).then(() => {
        drawer.goToFeedback();
        // Create donor sits on the collapsed header — no need to open the row first.
        cy.get('[data-cy="feedbackCreateDonorButton"]').click();

        // Anchored on the top of the form: name, student ID and phone arriving already filled in is
        // the thing worth showing, not the Create button at the far end of it.
        cy.get('[data-cy="newDonorNameTextBoxId"]').should('have.value', 'Sadia Afrin').scrollIntoView();
        hideOverlays();
        cy.wait(1500);
        cy.screenshot('registration-prefilled-form', { capture: 'viewport' });
      });
    });
  });
});
