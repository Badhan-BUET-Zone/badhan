import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { interceptRoutes, waitFor } from '@support/routes';
import { MESSAGES } from '@support/constants';

describe('Statistics - All Members tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows at least one member in the All Members table', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Intercept All Members API before navigation
    interceptRoutes.allMembers();

    // Navigate to Statistics
    drawer.goToStatistics();

    // Switch to All Members tab
    stats.openAllMembersTab();

    // Wait for data and assert at least one row
    waitFor.allMembersOk();
    stats.assertAllMembersTableVisible();
    stats.assertAllMembersHasRows();
  });
});


