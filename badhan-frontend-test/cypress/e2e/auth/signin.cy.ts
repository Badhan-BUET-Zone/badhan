import { SignInPage } from '../../support/pages/SignInPage';
import { NotificationComponent } from '../../support/components/Notification';

// Exact message from backend on successful sign in
const SUCCESS_MESSAGE = 'Signed in successfully';

describe('Sign In Flow', () => {
  const page = new SignInPage();
  const notification = new NotificationComponent();

  it('signs in from base url and shows correct notification', () => {
    page.visit();

    // Phone in UI is without country code; store prefixes '88' internally
    page.typePhone('01500000000');
    page.typePassword('badhandev');
    page.submit();

    notification.getText().should('equal', SUCCESS_MESSAGE);
  });
});


