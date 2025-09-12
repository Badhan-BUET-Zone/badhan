import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
import { AppBarComponent } from '@components/AppBar';
import { ProfilePage } from '@pages/ProfilePage';
import { MESSAGES } from '@support/constants';

// This test uses existing UI on Home person cards to:
// - create a call record
// - add a whole blood donation
// - add a platelet donation
// Then navigates to the donor details page to delete the created records

describe('Home: person cards create and cleanup actions', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const home = new HomePage();
  const appBar = new AppBarComponent();
  const profile = new ProfilePage();

  it('creates call record, blood and platelet donations; then deletes them in details', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Submit an empty search to render person cards, then ensure at least one exists
    home.triggerSearch();
    home.assertAnyDonorCardExists();

    // Expand the first person card to reveal actions
    home.expandFirstCard();

    // Create a call record using the card action
    home.clickDirectCallOnFirstCard();
    notification.assertEquals(MESSAGES.callRecordAdded);

    // Add a whole blood donation using the date picker and Done button
    const today = new Date();
    const dd = String(today.getDate());
    home.openDatePickerOnFirstCard();
    home.pickDonationDayOnFirstCard(dd);
    home.confirmDateOnFirstCard();
    home.clickDonationDoneOnFirstCard();
    notification.assertEquals(MESSAGES.donationInserted);

    // Add a platelet donation (select Platelet, pick date, Done)
    home.openDatePickerOnFirstCard();
    home.pickDonationDayOnFirstCard(dd);
    home.confirmDateOnFirstCard();
    home.selectPlateletOnFirstCard();
    home.clickDonationDoneOnFirstCard();
    notification.assertEquals(MESSAGES.plateletDonationInserted);

    // Go to details (profile) from the same card
    home.clickSeeProfileOnFirstCard();

    // Delete the created records from profile
    // 1) Delete the most recent blood donation
    profile.expandDonationHistory();
    profile.deleteFirstDonationCard();
    profile.confirmDeletion();
    notification.assertEquals(MESSAGES.donationDeleted);

    // 2) Delete the most recent platelet donation (requires expanding platelet history)
    profile.expandPlateletDonationHistory();
    profile.deleteFirstDonationCard();
    profile.confirmDeletion();
    notification.assertEquals(MESSAGES.plateletDonationDeleted);

    // 3) Delete the most recent call record
    profile.expandCallHistory();
    profile.deleteFirstCallRecord(MESSAGES.callRecordDeleted);

    // Navigate back and sign out to end cleanly
    appBar.clickBack();
    appBar.signOut();
    notification.assertEquals(MESSAGES.signOutSuccess);
  });
});
