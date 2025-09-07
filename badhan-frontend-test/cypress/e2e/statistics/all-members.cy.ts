import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Statistics - All Members tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows at least one member in the All Members table', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Intercept All Members API before navigation
    cy.intercept('GET', '**/donors/designation/all').as('getAllMembers');

    // Navigate to Statistics
    drawer.goToStatistics();

    // Switch to All Members tab
    cy.get('#statisticsAllVolunteersTabId').click();

    // Wait for data and assert at least one row
    cy.wait('@getAllMembers').its('response.statusCode').should('eq', 200);
    cy.get('#statisticsAllVolunteersTableId').should('be.visible');
    cy.get('#statisticsAllVolunteersTableId .v-data-table__wrapper tbody tr').its('length').should('be.gte', 1);
  });
});


