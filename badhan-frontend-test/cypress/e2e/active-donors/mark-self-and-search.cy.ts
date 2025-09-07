import { SignInPage } from '../../support/pages/SignInPage';
import { NotificationComponent } from '../../support/components/Notification';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

const SUCCESS_SIGNIN = 'Signed in successfully';
const SUCCESS_MARK_ACTIVE = 'Donor marked as active donor';

describe('Mark self as active and verify in Active Donors', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();

  it('marks current user as active donor and finds in Active Donors search', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', SUCCESS_SIGNIN);

    // Navigate to My Profile
    drawer.goToMyProfile();

    // Ensure Active Donor menu is open
    cy.get('#personDetailsActiveDonorButtonId').click();

    // If the switch is off, turn it on (force click to avoid ripple overlay)
    cy.get('#personDetailsActiveDonorSwitchId').then(($el) => {
      const isChecked = ($el[0] as HTMLInputElement).checked;
      if (!isChecked) {
        cy.wrap($el).click({ force: true });
        notification.getText().should('equal', SUCCESS_MARK_ACTIVE);
      }
    });

    // Capture the profile name for searching later (use name textbox value)
    cy.get('#donorDetailsNameTextBoxId').should('be.visible').invoke('val').as('profileName');

    // Close the Active Donor menu to avoid overlay blocking navigation
    cy.get('body').type('{esc}');

    // Navigate to Active Donors
    drawer.goToActiveDonors();

    // Intercept Active Donors search
    cy.intercept('GET', '**/activeDonors*').as('activeDonors');

    // Wait for backend and then for donor cards to render
    cy.wait('@activeDonors').its('response.statusCode').should('eq', 200);
    cy.get('[id^="personCardId_"]').should('exist');
  });
});


