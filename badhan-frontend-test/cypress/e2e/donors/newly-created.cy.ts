import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

describe('Newly Created Donors', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('shows at least one donor after fetching newly created donors', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', 'Signed in successfully');

    // Ensure we have at least one fresh donor by creating one quickly
    drawer.goToSingleDonorCreation();

    cy.intercept('POST', '**/donors').as('createDonor');

    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `E2E New Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605012';

    cy.get('#newDonorNameTextBoxId').type(donorName).blur();
    cy.get('#newDonorPhoneTextBoxId').type(donorPhone).blur();
    cy.get('#newDonorStudentIdTextBoxId').type(studentId).blur();

    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').click();
    cy.contains('.v-list-item__title', 'A+').click();
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').blur();

    cy.get('[data-cy="hall-select"]').click();
    cy.contains('.v-list-item__title', '(Unknown)').click();
    cy.get('[data-cy="hall-select"]').blur();

    cy.get('#newDonorDonationCountTextFieldId').clear().type('0');
    cy.get('#newDonorPlateletDonationCountTextFieldId').clear().type('0');
    cy.get('#newDonorCreateButtonId').click();

    cy.wait('@createDonor').its('response.statusCode').should('eq', 201);

    // Navigate to Newly Created Donors page
    drawer.goToNewlyCreatedDonors();

    // Fetch and wait for API
    cy.intercept('GET', '**/donors/new*').as('getNewDonors');
    cy.contains('button', 'Fetch Newly Created Donors').click();
    cy.wait('@getNewDonors').its('response.statusCode').should('eq', 200);

    // Assert at least one donor card rendered
    cy.get('[id^="personCardId_"]').its('length').should('be.gte', 1);
  });
});


