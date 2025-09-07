import { SignInPage } from '../../support/pages/SignInPage';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { NotificationComponent } from '../../support/components/Notification';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

// Frontend shows this on successful donor create
const CREATE_SUCCESS_MESSAGE = 'Donor added successfully';

describe('Single Donor Creation', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();

  it('creates a donor and shows success notification (validated by backend response)', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    // Verify login notification to ensure auth state
    notification.getText().should('equal', 'Signed in successfully');

    // Navigate to Single Donor Creation via drawer
    drawer.goToSingleDonorCreation();

    // Observe backend call
    cy.intercept('POST', '**/donors').as('createDonor');

    // Fill the form (ids from NewPersonCard.vue)
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Test Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605011';

    cy.get('#newDonorNameTextBoxId').type(donorName).blur();
    cy.get('#newDonorPhoneTextBoxId').type(donorPhone).blur();
    cy.get('#newDonorStudentIdTextBoxId').type(studentId).blur();

    // Blood group select via data-cy attribute on Selector
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').click();
    cy.contains('.v-list-item__title', 'A+').click();
    cy.get('[data-cy="newDonorBloodGroupDropDownId"]').blur();

    // Hall select (uses data-cy="hall-select")
    cy.get('[data-cy="hall-select"]').click();
    cy.contains('.v-list-item__title', '(Unknown)').click();
    cy.get('[data-cy="hall-select"]').blur();

    // Optional fields
    cy.get('#newDonorRoomNumberTextFieldId').type('1001');
    cy.get('#newDonorAddressTextFieldId').type('Test Address');
    cy.get('#newDonorCommentTextFieldId').type('Test Comment');

    // Donation counts and dates (keep zero to avoid date requirement)
    cy.get('#newDonorDonationCountTextFieldId').clear().type('0');
    cy.get('#newDonorPlateletDonationCountTextFieldId').clear().type('0');

    // Create
    cy.get('#newDonorCreateButtonId').click();

    // Backend response should be 201
    cy.wait('@createDonor').its('response.statusCode').should('eq', 201);

    // Expect success notification
    notification.getText().should('equal', CREATE_SUCCESS_MESSAGE);
  });
});


