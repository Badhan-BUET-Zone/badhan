import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES, TEST_PASSWORDS } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

describe('Change Password - Update and Revert', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();

  it('changes password, validates notification, re-signs in, and reverts', () => {
    // Sign in with original credentials
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to My Profile and open Settings
    drawer.goToMyProfile();
    profile.assertSettingsVisible();
    profile.openSettings();

    // Change password to new value
    profile.typeNewPassword(TEST_PASSWORDS.newPassword);
    profile.typeConfirmPassword(TEST_PASSWORDS.newPassword);
    profile.savePassword();
    notification.assertEquals(MESSAGES.changePasswordSuccess);

    profile.typeNewPassword(AUTH_CREDENTIALS.password);
    profile.typeConfirmPassword(AUTH_CREDENTIALS.password);
    profile.savePassword();
    notification.assertEquals(MESSAGES.changePasswordSuccess);
  });
});


