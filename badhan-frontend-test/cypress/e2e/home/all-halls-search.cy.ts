import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
import { HALL, MESSAGES } from '@support/constants';
import { MEMBER_PASSWORD, createDonorViaApi, createVolunteerViaApi, uniqueDonor } from '@support/helpers/members';

// A super admin's search page offers "All Halls" in the hall picker, which sends hall=-1 and
// finds donors of every hall in one search. Nobody else is offered it, and neither is the Active
// Donors page, whose endpoint takes one real hall and would answer -1 with a 400.

const SUHRAWARDY = 5;
const TITUMIR = 6;
const ALL_HALLS_OPTION = '[data-cy="hall-selectAll Halls"]';

// The search page strips everything but letters from a name before searching, so the digits
// uniqueDonor appends do not narrow it: an unusual run of letters is what keeps this search to
// the donors made here.
const LABEL = 'Zqxv Allhalls';

describe('Search every hall at once', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const home = new HomePage();

  const volunteer = uniqueDonor('All Halls Volunteer', 1);
  // Not public data: with availableToAll on, the search drops the hall filter anyway, and these
  // donors would be found whatever the picker said.
  const inSuhrawardy = { ...uniqueDonor(LABEL, 2, SUHRAWARDY), availableToAll: false };
  const inTitumir = { ...uniqueDonor(LABEL, 3, TITUMIR), availableToAll: false };

  const signInAsSuperAdmin = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  const openHallPicker = () => {
    home.setSpecifyHallRadio();
    cy.get('[data-cy="hall-select"]').click({ force: true });
  };

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  before(() => {
    signInAsSuperAdmin();
    createVolunteerViaApi(volunteer);
    createDonorViaApi(inSuhrawardy);
    createDonorViaApi(inTitumir);
  });

  it('lets a super admin search every hall, sending hall=-1', () => {
    signInAsSuperAdmin();

    cy.get('[data-cy="filterNameTextboxId"]').clear({ force: true }).type(LABEL, { force: true });
    openHallPicker();
    cy.get(ALL_HALLS_OPTION).click({ force: true });

    cy.intercept('GET', '**/search/v3*').as('searchRequest');
    home.triggerSearch();
    cy.wait('@searchRequest').then(({ request, response }) => {
      expect(request.query.hall).to.eq('-1');
      expect(request.query.availableToAll).to.eq('false');
      expect(response?.statusCode).to.eq(200);
    });

    home.assertDonorCardWithNameExists(inSuhrawardy.name);
    home.assertDonorCardWithNameExists(inTitumir.name);
  });

  it('still searches one hall when one hall is picked', () => {
    signInAsSuperAdmin();

    cy.get('[data-cy="filterNameTextboxId"]').clear({ force: true }).type(LABEL, { force: true });
    openHallPicker();
    cy.get(`[data-cy="hall-select${HALL.TITUMIR}"]`).click({ force: true });

    cy.intercept('GET', '**/search/v3*').as('searchRequest');
    home.triggerSearch();
    cy.wait('@searchRequest').its('request.query.hall').should('eq', String(TITUMIR));

    home.assertDonorCardWithNameExists(inTitumir.name);
    cy.get('[data-cy="person-card"]').should('not.contain.text', inSuhrawardy.name);
  });

  it('does not offer All Halls to a volunteer', () => {
    signInPage.signIn(volunteer.phone, MEMBER_PASSWORD);
    notification.assertEquals(MESSAGES.signInSuccess);

    openHallPicker();
    cy.get(`[data-cy="hall-select${HALL.AHSANULLAH}"]`).should('exist');
    cy.get(ALL_HALLS_OPTION).should('not.exist');
  });

  it('does not offer All Halls on the Active Donors page, even to a super admin', () => {
    signInAsSuperAdmin();
    drawer.goToActiveDonors();

    // The page keeps its filters in a bottom sheet behind this button
    cy.contains('button', 'Filters').click({ force: true });
    openHallPicker();
    cy.get(`[data-cy="hall-select${HALL.SUHRAWARDY}"]`).should('exist');
    cy.get(ALL_HALLS_OPTION).should('not.exist');
  });
});
