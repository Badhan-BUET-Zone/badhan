import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { interceptRoutes } from '@support/routes';
import { MESSAGES } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

describe('Donations: POST then DELETE from profile (blood)', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();

  it('adds a blood donation and then deletes it via UI', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Go to My Profile
    drawer.goToMyProfile();

    // Ensure form is ready
    profile.assertFormReady();

    // Open date picker and select today's date, then confirm
    const today = new Date();
    const dd = String(today.getDate());
    cy.get('#personDetailsNewDonationTextboxId').click();
    cy.get('#personDetailsNewDonationDatePickerId').contains('button', dd).not('[disabled]').first().click();
    cy.get('#personDetailsNewDonationDatePickerOkButtonId').click();

    // Click Done to add new blood donation
    cy.get('#personDetailsNewDonationOkButtonId').click();

    // Assert success notification
    notification.assertEquals(MESSAGES.donationInserted);

    // Expand blood donation history and delete the first donation card
    cy.get('[id="personDetailsDonationHistoryButtonId"]').click();
    cy.get('[id^="donationCardDeleteButtonId_"]').first().click();
    cy.get('[data-cy="confirmationBoxButtonId"]:visible').first().click();

    // Assert deletion success notification
    notification.assertEquals(MESSAGES.donationDeleted);
  });
});


