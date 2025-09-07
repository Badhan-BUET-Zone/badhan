import { SignInPage } from '../../support/pages/SignInPage';
import { NotificationComponent } from '../../support/components/Notification';
import { NavigationDrawer } from '../../support/pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '../../support/auth/credentials';

// Exact message from backend on successful sign in
const SUCCESS_MESSAGE = 'Signed in successfully';

describe('My Profile Navigation', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();

  it('navigates to My Profile after signing in', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.getText().should('equal', SUCCESS_MESSAGE);

    // Navigate to My Profile via drawer
    drawer.goToMyProfile();

    // Assert profile page content is visible
    cy.get('#profileSettingsId').should('be.visible');
  });
});


