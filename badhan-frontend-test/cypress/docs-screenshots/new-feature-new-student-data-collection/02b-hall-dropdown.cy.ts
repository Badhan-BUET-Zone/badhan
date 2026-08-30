import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { openRegistrationQrPanel } from '@support/helpers/feedback';
import { hideOverlays } from '../hideOverlays';

// Documentation screenshot for docs/blog/new-feature-new-student-data-collection.md.
// ONE cy.screenshot() per spec file — see 01-sidebar-entry.cy.ts.
//
// The open hall dropdown, which only a super admin sees. Signed in as one here, so the capture
// shows what the blog describes: every hall, plus one option that is not a hall at all.

describe('docs screenshot — the hall dropdown, open', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();

  it('captures the hall list including All Halls', () => {
    cy.viewport(500, 900);
    cy.visit('/');
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    drawer.goToFeedback();
    openRegistrationQrPanel();

    const openMenu = '.v-menu__content.menuable__content__active';
    cy.get('[data-cy="registrationQrHallSelector"]').should('be.visible').click();
    cy.get(openMenu).should('be.visible');

    // The menu has its own max-height and scrolls internally, so a taller viewport does not bring
    // the last item into view — All Halls sits below the fold of the list itself. Scroll the list,
    // not the page. The capture then shows the bottom of it, which is the half that matters here.
    cy.get(openMenu).scrollTo('bottom');
    cy.contains(`${openMenu} .v-list-item`, 'All Halls').should('be.visible');
    hideOverlays();
    cy.wait(1500);
    cy.screenshot('registration-hall-dropdown', { capture: 'viewport' });
  });
});
