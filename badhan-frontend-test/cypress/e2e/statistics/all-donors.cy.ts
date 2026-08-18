import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';

describe('All Donors', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows at least one donor in the All Donors table', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Its own page under Super Admin now, not a tab of Statistics
    drawer.goToAllDonors();

    // Wait for table to render and assert at least one row
    stats.assertAllDonorsTableVisible();
    stats.assertAllDonorsHasRows();
    stats.assertAllDonorsNotPaginated();
    stats.assertAllDonorsDesignationColumn();
  });
});


