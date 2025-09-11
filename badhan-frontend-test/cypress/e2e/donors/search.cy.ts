import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
// removed network intercepts; rely on UI rendering instead
import { MESSAGES } from '@support/constants';

describe('Donor Search', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const home = new HomePage();

  it('searches for donors and shows at least one result', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Trigger search from Filters on Home page without changing defaults
    home.triggerSearch();

    // Assert at least one donor card is rendered under Home results
    home.assertAnyDonorCardExists();
  });
});


