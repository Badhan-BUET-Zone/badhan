import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';

describe('Statistics - Activity Summary (merged into Donation Report)', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows non-zero number of donors and volunteers', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Statistics
    drawer.goToStatistics();

    // The Activity Summary now lives at the top of the Donation Report tab
    stats.openDonationReportTab();

    // Assert stats values after UI renders
    stats.getDonorsCountText().then(text => {
      const numberMatch = text.match(/\d+/);
      expect(numberMatch).to.not.be.null;
      const donors = Number(numberMatch![0]);
      expect(donors).to.be.greaterThan(0);
    });
    stats.getVolunteersCountText().then(text => {
      const numberMatch = text.match(/\d+/);
      expect(numberMatch).to.not.be.null;
      const volunteers = Number(numberMatch![0]);
      expect(volunteers).to.be.greaterThan(0);
    });
  });
});


