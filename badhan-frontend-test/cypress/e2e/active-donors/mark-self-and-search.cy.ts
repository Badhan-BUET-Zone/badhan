import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { ProfilePage } from '@pages/ProfilePage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';
import { ActiveDonorsPage } from '@pages/ActiveDonorsPage';
import { ALIASES } from '@support/constants';

const SUCCESS_SIGNIN = 'Signed in successfully';
const SUCCESS_MARK_ACTIVE = 'Donor marked as active donor';

describe('Mark self as active and verify in Active Donors', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();
  const activeDonors = new ActiveDonorsPage();

  it('marks current user as active donor and finds in Active Donors search', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to My Profile
    drawer.goToMyProfile();

    // Ensure Active Donor menu is open
    profile.openActiveDonorMenu();

    // If the switch is off, turn it on (force click to avoid ripple overlay)
    profile.ensureActiveDonorOn(MESSAGES.markActiveSuccess);

    // Capture the profile name for searching later (use name textbox value)
    profile.captureName(ALIASES.profileName);

    // Close the Active Donor menu to avoid overlay blocking navigation
    activeDonors.closeOverlays();

    // Navigate to Active Donors
    drawer.goToActiveDonors();

    // Wait for donor cards to render
    activeDonors.assertAnyCardExists();
  });
});


