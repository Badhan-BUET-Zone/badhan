import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Members page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows at least 1 volunteer, 1 hall admin and 1 superadmin', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Navigate to Members
    drawer.goToMembers();

    // Intercept the designations API and wait
    cy.intercept('GET', '**/donors/designation').as('getDesignations');
    cy.wait('@getDesignations').its('response.statusCode').should('eq', 200);

    // Assert volunteers table has at least 1 row
    cy.get('[id^="volunteerId_"]').its('length').should('be.gte', 1);

    // Assert hall admins table has at least 1 row
    cy.get('[id^="hallAdminId_"]').its('length').should('be.gte', 1);

    // Assert super admins table has at least 1 row
    cy.get('[id^="superAdminId_"]').its('length').should('be.gte', 1);
  });
});


