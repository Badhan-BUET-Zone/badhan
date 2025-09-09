import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { AppBarComponent } from '@components/AppBar';
import { MESSAGES } from '@support/constants';

// Exact message from backend on successful sign in
const SUCCESS_MESSAGE = 'Signed in successfully';

describe('Sign In Flow', () => {
  const page = new SignInPage();
  const notification = new NotificationComponent();
  const appBar = new AppBarComponent();

  it('signs in from base url and shows correct notification', () => {
    page.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  });

  it('signs out after signing in and shows correct notification', () => {
    page.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    appBar.signOut();
    notification.assertEquals(MESSAGES.signOutSuccess);
  });
});


