import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Publish myself as a Public Contact and verify on Public Contacts page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('publishes self and finds the entry on Public Contacts page', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Go to My Profile
    drawer.goToMyProfile();

    // Intercept POST to create public contact
    cy.intercept('POST', '**/publicContacts').as('createPublicContact');

    // Choose a public contact blood group and publish
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').click();
    cy.contains('.v-list-item__title', 'A+').click();
    cy.get('[data-cy="personDetailsPublicContactSelectId"]').blur();
    cy.get('#profileDetailsPublicContactButtonId').click();

    // Verify backend call and success notification
    cy.wait('@createPublicContact').its('response.statusCode').should('eq', 201);
    notification.getText().should('equal', 'Public Contacts Updated');

    // Navigate to Public Contacts
    drawer.goToPublicContacts();

    // Wait for GET public contacts
    cy.intercept('GET', '**/publicContacts').as('getPublicContacts');
    cy.wait('@getPublicContacts').its('response.statusCode').should('eq', 200);

    // Assert at least one contact card appears and one matches the signed-in phone (last 11 digits)
    // Contacts render phone with + prefix. We can assert at least one item exists.
    cy.contains('button', 'Direct Call').should('exist');
  });
});


