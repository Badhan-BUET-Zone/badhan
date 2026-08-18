import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { ActiveDonorsPage } from '@pages/ActiveDonorsPage';
import { MESSAGES } from '@support/constants';
import {
  MEMBER_PASSWORD,
  archiveDonorViaApi,
  createDonorViaApi,
  createVolunteerViaApi,
  markActiveDonorViaApi,
  uniqueDonor,
} from '@support/helpers/members';

const SUHRAWARDY = 5;

describe('Active Donors: the archived chip', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const activeDonors = new ActiveDonorsPage();

  // Suhrawardy: the Active Donors page loads with that hall hardcoded in its default
  // query, which the backend rejects for a member of any other hall
  const volunteer = uniqueDonor('Active Chip Volunteer', 1, SUHRAWARDY);
  const archived = uniqueDonor('Active Chip Archived', 2);

  it('shows an archived donor with its chip to a volunteer', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    createVolunteerViaApi(volunteer);
    // marked first, then archived: archiving must not remove the activedonors row, and
    // the chip is what tells a member why the record looks the way it does
    createDonorViaApi(archived)
      .then((donorId) => markActiveDonorViaApi(donorId))
      .then((donorId) => archiveDonorViaApi(donorId));

    cy.clearLocalStorage();
    signInPage.signIn(volunteer.phone, MEMBER_PASSWORD);
    notification.assertEquals(MESSAGES.signInSuccess);

    drawer.goToActiveDonors();
    // This volunteer bookmarked nothing — the row was marked by the admin above — and the page
    // opens on your own bookmarks, so everybody's is what this spec has to ask for.
    activeDonors.showBookmarksFromEveryone();
    activeDonors.assertAnyCardExists();
    cy.get('[data-cy="person-card"].v-card').should('have.length', 1).and('contain.text', archived.name);
    cy.get('[data-cy^="personCardArchivedChipId_"]').should('be.visible').and('contain.text', 'Archived');
  });
});
