import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';

describe('Statistics - Donation Report tab', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();

  it('shows both blood and platelet donation tables', () => {
    // Sign in as superadmin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Statistics
    drawer.goToStatistics();

    // Click Donation Report tab
    stats.openDonationReportTab();

    // Assert both section titles exist (after data rendered)
    stats.assertWholeBloodSectionExists();
    stats.assertPlateletSectionExists();

    // Optional: at least one row across both tables
    stats.assertAnyTableRowExists();
  });
});


