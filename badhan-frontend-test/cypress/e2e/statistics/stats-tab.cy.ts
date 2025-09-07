import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Statistics - Stats tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows non-zero number of donors and volunteers', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Intercept stats API before navigation
    cy.intercept('GET', '**/log/statistics').as('getStats');

    // Navigate to Statistics
    drawer.goToStatistics();

    // Click Stats tab
    cy.get('#statisticsStatsTabId').click();

    // Wait for stats and assert non-zero values
    cy.wait('@getStats').its('response.statusCode').should('eq', 200);
    cy.get('#statsNumberOfDonors').should('be.visible').invoke('text').then(text => {
      const numberMatch = text.match(/\d+/);
      expect(numberMatch).to.not.be.null;
      const donors = Number(numberMatch![0]);
      expect(donors).to.be.greaterThan(0);
    });
    cy.contains('p', 'Number of volunteers').should('be.visible').invoke('text').then(text => {
      const numberMatch = text.match(/\d+/);
      expect(numberMatch).to.not.be.null;
      const volunteers = Number(numberMatch![0]);
      expect(volunteers).to.be.greaterThan(0);
    });
  });
});


