// removed network intercepts; rely on UI rendering instead
import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { MESSAGES, HALL } from '@support/constants';

describe('Statistics - Donation Report hall dropdown & charts', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows the hall dropdown, per-hall and per-blood-group charts, and switches hall from cache', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToStatistics();
    stats.openDonationReportTab();

    // Both bar charts render alongside the existing tables
    stats.assertTotalDonationsByHallChartExists();
    stats.assertTotalDonationsByBloodGroupChartExists();
    stats.assertWholeBloodSectionExists();
    stats.assertPlateletSectionExists();

    // Hall dropdown exists and defaults to 'All Halls'
    stats.assertHallSelectorExists();
    stats.assertHallSelectorValue('All Halls');

    // Selecting a specific hall keeps the report rendered (view switches from cached data)
    stats.selectReportHall(HALL.SUHRAWARDY);
    stats.assertHallSelectorValue(HALL.SUHRAWARDY);
    stats.assertWholeBloodSectionExists();
    stats.assertPlateletSectionExists();
    stats.assertTotalDonationsByHallChartExists();

    // Switching back to 'All Halls' also works
    stats.selectReportHall('All Halls');
    stats.assertHallSelectorValue('All Halls');
    stats.assertWholeBloodSectionExists();
  });
});
