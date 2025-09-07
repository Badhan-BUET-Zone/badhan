import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Statistics - Donation Report tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows both blood and platelet donation tables', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Intercept report APIs before navigation
    cy.intercept('GET', '**/donations/report*').as('getBloodReport');
    cy.intercept('GET', '**/platelet-donations/report*').as('getPlateletReport');

    // Navigate to Statistics
    drawer.goToStatistics();

    // Click Donation Report tab
    cy.get('#statisticsDonationReportTabId').click();

    // Wait for both APIs to resolve
    cy.wait('@getBloodReport').its('response.statusCode').should('eq', 200);
    cy.wait('@getPlateletReport').its('response.statusCode').should('eq', 200);

    // Assert both section titles exist (after data rendered)
    cy.contains('div', 'Whole Blood Donations', { matchCase: false }).should('exist');
    cy.contains('div', 'Platelet Donations', { matchCase: false }).should('exist');

    // Optional: at least one row across both tables
    cy.get('table tbody tr').its('length').should('be.gte', 1);
  });
});


