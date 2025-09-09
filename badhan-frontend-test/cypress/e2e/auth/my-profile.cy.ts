import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

// Exact message from backend on successful sign in
const SUCCESS_MESSAGE = 'Signed in successfully';

describe('My Profile Navigation', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();

  it('navigates to My Profile after signing in', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to My Profile via drawer
    drawer.goToMyProfile();

    // Assert profile page content is visible
    profile.assertSettingsVisible();
  });
});


