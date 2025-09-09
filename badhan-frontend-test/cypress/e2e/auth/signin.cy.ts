import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { MESSAGES } from '@support/constants';

// Exact message from backend on successful sign in
const SUCCESS_MESSAGE = 'Signed in successfully';

describe('Sign In Flow', () => {
  const page = new SignInPage();
  const notification = new NotificationComponent();

  it('signs in from base url and shows correct notification', () => {
    page.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  });
});


