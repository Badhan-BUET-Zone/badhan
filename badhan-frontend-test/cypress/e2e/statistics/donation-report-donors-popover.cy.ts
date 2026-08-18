import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { StatisticsPage } from '@pages/StatisticsPage';
import { ProfilePage } from '@pages/ProfilePage';
import { MESSAGES } from '@support/constants';

describe('Donation Report cell drill-down', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const stats = new StatisticsPage();
  const profile = new ProfilePage();

  it('lists the donors behind a cell and opens a donor profile from the popover', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // The report covers [three months ago, today), so the donation has to be dated
    // before today to be counted — yesterday is always inside the window
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    drawer.goToMyProfile();
    profile.assertFormReady();
    profile.openDonationDatePicker();
    if (yesterday.getMonth() !== today.getMonth()) {
      profile.goToPreviousMonthInDonationDatePicker();
    }
    profile.pickDonationDay(yesterday.getDate());
    profile.confirmDonationDate();
    profile.submitNewDonation();
    notification.assertEquals(MESSAGES.donationInserted);

    // The report generates itself on mount, so the new donation is already counted
    drawer.goToDonationReport();
    stats.assertWholeBloodSectionExists();

    // Clicking a non-zero cell drills down into the donations it counted
    stats.openWholeBloodGrandTotalPopover();
    stats.assertPopoverDonorsListed();

    // Picking a donor opens their profile in a pop-up window, as the members page does
    cy.window().then((win) => {
      cy.stub(win, 'open').as('openProfileWindow');
    });
    stats.clickFirstPopoverDonor();
    cy.get('@openProfileWindow').should('have.been.calledWithMatch', /#\/home\/details\?id=/);

    // Leave the profile as it was found
    drawer.goToMyProfile();
    profile.assertFormReady();
    profile.expandDonationHistory();
    profile.deleteFirstDonationCard();
    profile.confirmDeletion();
    notification.assertEquals(MESSAGES.donationDeleted);
  });
});
