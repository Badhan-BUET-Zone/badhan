import { SignInPage } from '../../support/pages/SignInPage';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Donor Search', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();

  it('searches for donors and shows at least one result', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Prepare to observe the search request to /search/v3
    cy.intercept('GET', '**/search/v3*').as('searchV3');

    // Trigger search from Filters on Home page without changing defaults
    cy.get('#filterSearchButtonId').click();

    // Ensure backend responded OK
    cy.wait('@searchV3').its('response.statusCode').should('eq', 200);

    // Assert at least one donor card is rendered under Home results
    cy.get('[id^="personCardId_"]').its('length').should('be.greaterThan', 0);
  });
});


