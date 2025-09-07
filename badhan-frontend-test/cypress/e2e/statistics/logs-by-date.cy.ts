import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Statistics - Logs by Date', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows at least one log in Logs by Date tab', () => {
    // Sign in as superadmin (required for stats access)
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Intercept logs API BEFORE navigation
    cy.intercept('GET', '**/log').as('getLogs');

    // Navigate to Statistics
    drawer.goToStatistics();

    cy.wait('@getLogs').its('response.statusCode').should('eq', 200);

    // Ensure Logs by Date tab element is present
    cy.get('#statisticsLogsByDateTabId').should('exist');

    // There should be at least one DateLog group rendered: look for Details buttons with id prefix
    cy.get('[id^="dateLogDetailsButtonId_"]').its('length').should('be.gte', 1);
  });
});


