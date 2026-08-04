import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { MESSAGES } from '@support/constants';
import {
  MEMBER_PASSWORD,
  archiveDonorViaApi,
  createDonorViaApi,
  createVolunteerViaApi,
  uniqueDonor,
} from '@support/helpers/members';

describe('Statistics - Archived Donors tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  const liveDonor = uniqueDonor('All Donors Live', 1);
  const archivedDonor = uniqueDonor('All Donors Archived', 2);
  const volunteer = uniqueDonor('All Donors Volunteer', 3);

  const signInAsSuperAdmin = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  beforeEach(() => {
    // the suite-level fixture setup leaves a session behind that test isolation does not
    // clear before the first test
    cy.clearLocalStorage();
  });

  before(() => {
    signInAsSuperAdmin();
    createDonorViaApi(liveDonor);
    createDonorViaApi(archivedDonor).then((donorId) => archiveDonorViaApi(donorId));
    createVolunteerViaApi(volunteer);
  });

  it('flips between the two partitions on a tab click, without a page reload', () => {
    signInAsSuperAdmin();
    drawer.goToStatistics();

    cy.intercept('GET', '**/donors/all*').as('allDonors');
    stats.openAllDonorsTab();
    cy.wait('@allDonors').its('request.query.archiveFlag').should('eq', 'false');
    cy.get('[data-cy="statisticsAllDonorsTableId"]')
      .should('contain.text', liveDonor.name)
      .and('not.contain.text', archivedDonor.name);

    // Both tabs render the same component, so this is the case that catches a missing
    // re-fetch: without it the table would still be showing the rows above
    stats.openArchivedDonorsTab();
    cy.wait('@allDonors').its('request.query.archiveFlag').should('eq', 'true');
    cy.get('[data-cy="statisticsAllDonorsTableId"]')
      .should('contain.text', archivedDonor.name)
      .and('not.contain.text', liveDonor.name);
  });

  it('renders the archived list when the tab is deep-linked', () => {
    signInAsSuperAdmin();

    cy.intercept('GET', '**/donors/all*').as('allDonors');
    cy.visit('/#/statistics/archivedDonorsAll');
    cy.reload();
    cy.wait('@allDonors').its('request.query.archiveFlag').should('eq', 'true');
    cy.contains('List of archived donors').should('be.visible');
    cy.get('[data-cy="statisticsAllDonorsTableId"]')
      .should('contain.text', archivedDonor.name)
      .and('not.contain.text', liveDonor.name);
  });

  it('keeps the whole page away from a volunteer', () => {
    signInPage.signIn(volunteer.phone, MEMBER_PASSWORD);
    notification.assertEquals(MESSAGES.signInSuccess);

    // bounced by the designation: 3 route guard before the page loads, so neither tab
    // is ever rendered
    cy.visit('/#/statistics/archivedDonorsAll');
    cy.reload();
    cy.get('[data-cy="statisticsArchivedDonorsTabId"]').should('not.exist');
    cy.get('[data-cy="statisticsAllDonorsTabId"]').should('not.exist');
    cy.url().should('not.contain', 'archivedDonorsAll');
  });
});
