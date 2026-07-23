import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
// removed network intercepts; rely on UI rendering instead
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

    // Navigate to Statistics (defaults to the Donation Report tab)
    drawer.goToStatistics();

    // Open the App Activity (Logs by Date) tab
    stats.ensureLogsByDateTabExists();
    stats.openLogsByDateTab();

    // There should be at least one DateLog group rendered: look for Details buttons with id prefix
    stats.assertAnyDateLogDetailExists();
  });
});


