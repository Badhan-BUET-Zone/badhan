import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { interceptRoutes, waitFor } from '@support/routes';
import { MESSAGES } from '@support/constants';

describe('Statistics - Logs by Date', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows at least one log in Logs by Date tab', () => {
    // Sign in as superadmin (required for stats access)
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Intercept logs API BEFORE navigation
    interceptRoutes.logs();

    // Navigate to Statistics
    drawer.goToStatistics();

    waitFor.logsOk();

    // Ensure Logs by Date tab element is present
    stats.ensureLogsByDateTabExists();

    // There should be at least one DateLog group rendered: look for Details buttons with id prefix
    stats.assertAnyDateLogDetailExists();
  });
});


