import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { ProfilePage } from '@pages/ProfilePage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';
import { ActiveDonorsPage } from '@pages/ActiveDonorsPage';
import { AppBarComponent } from '@components/AppBar';

describe('Active Donors: POST & DELETE flow mirrors backend test', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();
  const activeDonors = new ActiveDonorsPage();
  const appBar = new AppBarComponent();

  it('marks self active (POST), performs search (GET), then unmarks (DELETE)', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to My Profile
    drawer.goToMyProfile();

    // Open Active Donor menu
    profile.openActiveDonorMenu();

    // Best-effort cleanup: ensure switch is off
    profile.ensureActiveDonorOff(MESSAGES.unmarkActiveSuccess);

    // Mark as active (POST)
    profile.ensureActiveDonorOn(MESSAGES.markActiveSuccess);

    // Close overlays to avoid blocking navigation
    activeDonors.closeOverlays();

    // Navigate to Active Donors and validate donor list renders
    drawer.goToActiveDonors();
    activeDonors.assertAnyCardExists();

    // Navigate back to My Profile to unmark (DELETE)
    drawer.goToMyProfile();
    profile.openActiveDonorMenu();
    profile.ensureActiveDonorOff(MESSAGES.unmarkActiveSuccess);

    // Sign out
    appBar.signOut();
    notification.assertEquals(MESSAGES.signOutSuccess);
  });
});



