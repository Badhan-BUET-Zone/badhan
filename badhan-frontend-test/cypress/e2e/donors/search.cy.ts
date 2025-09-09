import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
import { interceptRoutes, waitFor } from '@support/routes';
import { MESSAGES } from '@support/constants';

describe('Donor Search', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const home = new HomePage();

  it('searches for donors and shows at least one result', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Prepare to observe the search request to /search/v3
    interceptRoutes.searchV3();

    // Trigger search from Filters on Home page without changing defaults
    home.triggerSearch();

    // Ensure backend responded OK
    waitFor.searchV3Ok();

    // Assert at least one donor card is rendered under Home results
    home.assertAnyDonorCardExists();
  });
});


