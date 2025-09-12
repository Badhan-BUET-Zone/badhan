import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

describe('Logins management - re-auth and delete extra login', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();

  it('logs in twice (after clearing x-auth), fetches logins, and deletes the extra login', () => {
    // First login
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Clear token and refresh (encapsulated)
    signInPage.clearAuthToken();
    signInPage.reload();

    // Login again
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Go to My Profile
    drawer.goToMyProfile();

    // Fetch recent logins via page object
    profile.clickGetRecentLogins();

    // Ensure there is at least one other-device login (delete button present)
    profile.assertHasDeletableLogins();

    // Delete the first extra login and assert success notification
    profile.deleteFirstOtherDeviceLogin();
    notification.assertEquals(MESSAGES.logoutFromDeviceSuccess);
  });
});


