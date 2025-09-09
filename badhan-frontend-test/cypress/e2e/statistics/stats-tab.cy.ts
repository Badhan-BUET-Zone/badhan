import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { interceptRoutes, waitFor } from '@support/routes';
import { MESSAGES } from '@support/constants';

describe('Statistics - Stats tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows non-zero number of donors and volunteers', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Intercept stats API before navigation
    interceptRoutes.stats();

    // Navigate to Statistics
    drawer.goToStatistics();

    // Click Stats tab
    stats.openStatsTab();

    // Wait for stats and assert non-zero values
    waitFor.statsOk();
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


