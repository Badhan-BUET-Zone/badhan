import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';
import { ActiveDonorsPage } from '@pages/ActiveDonorsPage';
import { AppBarComponent } from '@components/AppBar';
import { ProfilePage } from '@pages/ProfilePage';

describe('Call Records: POST then DELETE from profile', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const activeDonors = new ActiveDonorsPage();
  const appBar = new AppBarComponent();
  const profile = new ProfilePage();

  it('creates a call record from card, then deletes it from profile', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    // Ensure self is marked as Active Donor before navigating
    drawer.goToMyProfile();
    profile.openActiveDonorMenu();
    profile.ensureActiveDonorOn(MESSAGES.markActiveSuccess);
    activeDonors.closeOverlays();

    // Go to Active Donors and wait for list via UI
    drawer.goToActiveDonors();
    activeDonors.assertAnyCardExists();

    // Expand first card and trigger Direct call (POST /callrecords)
    activeDonors.expandFirstCard();
    activeDonors.directCallOnFirstCard();
    notification.assertEquals(MESSAGES.callRecordAdded);

    // Open profile from the same card to reach Call History section
    activeDonors.seeProfileOnFirstCard();

    // Expand Call History and delete the first call record (DELETE /callrecords)
    profile.expandCallHistory();
    profile.deleteFirstCallRecord(MESSAGES.callRecordDeleted);

    // Navigate back using top bar back button to ensure no overlay blocks the menu
    appBar.clickBack();
    
    // Sign out
    appBar.signOut();
    notification.assertEquals(MESSAGES.signOutSuccess);
  });
});


