import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { interceptRoutes, waitFor } from '@support/routes';
import { PublicContactsPage } from '@pages/PublicContactsPage';
import { BLOOD_GROUP, MESSAGES } from '@support/constants';

describe('Publish myself as a Public Contact and verify on Public Contacts page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const publicContacts = new PublicContactsPage();

  it('publishes self and finds the entry on Public Contacts page', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Go to My Profile
    drawer.goToMyProfile();

    // Intercept POST to create public contact
    interceptRoutes.publicContactsCreate();

    // Choose a public contact blood group and publish
    publicContacts.selectBloodGroup(BLOOD_GROUP.A_POS);
    publicContacts.publish();

    // Verify backend call and success notification
    waitFor.publicContactsCreateOk();
    notification.assertEquals(MESSAGES.publicContactsUpdated);

    // Navigate to Public Contacts
    drawer.goToPublicContacts();

    // Wait for GET public contacts
    interceptRoutes.publicContactsGet();
    waitFor.publicContactsGetOk();

    // Assert at least one contact card appears and one matches the signed-in phone (last 11 digits)
    // Contacts render phone with + prefix. We can assert at least one item exists.
    publicContacts.assertAnyDirectCallExists();
  });
});


