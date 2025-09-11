import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { interceptRoutes, waitFor } from '@support/routes';
import { MESSAGES } from '@support/constants';
import { MembersPage } from '@pages/MembersPage';

describe('Members page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const members = new MembersPage();

  it('shows at least 1 volunteer, 1 hall admin and 1 superadmin', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Members
    drawer.goToMembers();

    // // Intercept the designations API and wait
    // interceptRoutes.designations();
    // waitFor.designationsOk();

    members.assertAnyVolunteerExists();
    members.assertAnyHallAdminExists();
    members.assertAnySuperAdminExists();
  });
});


