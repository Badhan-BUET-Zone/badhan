import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// An All Halls code, generated. Two things are worth photographing together: the line warning that
// students will be asked which hall they are in, and the sheet itself saying "All Halls" where an
// ordinary code names a hall.

describe('docs screenshot — a generated All Halls code', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the All Halls notice and the code labelled All Halls', () => {
    cy.viewport(500, 900);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    cy.get('[data-cy="registrationQrHallSelector"]').click();
    cy.contains('.v-menu__content.menuable__content__active .v-list-item', 'All Halls').click();
    cy.get('[data-cy="registrationQrAllHallsNotice"]').should('be.visible');
    cy.get('[data-cy="registrationQrGenerateButton"]').click();

    cy.get('[data-cy="feedbackQrHallLine"]').should('exist');
    cy.get('[data-cy="registrationQrExpiry"]')
      .should('be.visible')
      .scrollIntoView({ offset: { top: -100, left: 0 } });
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-all-halls-code', { capture: 'viewport' });
  });
});
