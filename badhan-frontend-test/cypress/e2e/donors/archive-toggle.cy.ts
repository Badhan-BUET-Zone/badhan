import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AppBarComponent } from '@components/AppBar';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { ActiveDonorsPage } from '@pages/ActiveDonorsPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

const ARCHIVE_DEMOTION_HINT = 'Will also demote this member to a regular donor on save';
const MEMBER_PASSWORD = 'archivetest1';
const API_BASE_URL = (Cypress.env('apiBaseURL') as string) || 'http://localhost:3000';

describe('Donor archiving from the detail page', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const appBar = new AppBarComponent();
  const newDonor = new NewDonorPage();
  const profile = new ProfilePage();
  const activeDonors = new ActiveDonorsPage();

  // `index` keeps the phone unique even when two donors are created in the same millisecond
  const uniqueDonor = (label: string, index: number) => {
    const suffix = String(Date.now()).slice(-7);
    return {
      name: `${label} ${suffix}${index}`,
      phone: `01${suffix}${index}`.slice(0, 11).padEnd(11, '0'),
      studentId: '1605012',
    };
  };

  // Returns the created donor's id, so profiles can be opened by direct link rather than
  // through the search page
  const createDonor = (
    donor: { name: string; phone: string; studentId: string },
    alias: string,
    hall: string = HALL.AHSANULLAH,
  ) => {
    // Reloaded rather than routed: a hash-only visit to the route we are already on does
    // not reset the half-filled card left by a previous creation, and clicking the drawer
    // link to the current route just leaves the drawer covering the form
    cy.visit('/#/singleDonorCreation');
    cy.reload();
    cy.intercept('POST', '**/donors').as(`create_${alias}`);
    newDonor.fillBasic(donor);
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(hall);
    newDonor.fillOptional({ room: 'A-101', address: 'Archive Street' });
    newDonor.setPublicData(true);
    newDonor.submit();
    notification.assertEquals(MESSAGES.donorCreateSuccess);
    cy.wait(`@create_${alias}`).then((interception) => {
      cy.wrap(interception.response!.body.newDonor._id).as(alias);
    });
  };

  // Reloaded for the same reason the creation page is: going from one detail page to
  // another is a hash-only visit, which leaves the previous donor's component mounted
  const openProfile = (donorId: string) => {
    cy.visit(`/#/home/details?id=${donorId}`);
    cy.reload();
    profile.assertSettingsVisible();
  };

  // The only supported way to get a session for another member: the super admin issues a
  // password recovery token for them, that token is spent on a known password, and the
  // member then signs in through the ordinary form. The recovery route rejects plain
  // donors, so the target must already be a volunteer or an admin.
  const signInAsMember = (donorId: string, phone: string) => {
    cy.window().then((win) => {
      const superAdminToken = win.localStorage.getItem('x-auth');
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/donors/password`,
        headers: { 'x-auth': superAdminToken },
        body: { donorId },
      }).then((recoveryResponse) => {
        cy.request({
          method: 'PATCH',
          url: `${API_BASE_URL}/users/password`,
          headers: { 'x-auth': recoveryResponse.body.token },
          body: { password: MEMBER_PASSWORD },
        });
      });
    });
    // left the detail page first: its card is a fixed overlay that covers the app bar
    cy.visit('/#/home');
    appBar.signOut();
    signInPage.signIn(phone, MEMBER_PASSWORD);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  const signInAsSuperAdmin = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  it('archives a volunteer with a demotion hint instead of a dialog, and demotes on save', () => {
    signInAsSuperAdmin();

    const donor = uniqueDonor('Archivable Member', 1);
    createDonor(donor, 'archivableId');

    cy.get('@archivableId').then((archivableId) => {
      openProfile(String(archivableId));
      profile.openSettings();
      profile.clickPromoteToVolunteer();
      notification.assertEquals(MESSAGES.promoteVolunteerSuccess);
      profile.assertDesignation('Volunteer');
      profile.assertArchivedChipAbsent();

      // Flipping the switch only hints at the demotion
      profile.toggleArchive(true);
      profile.assertArchiveHint(ARCHIVE_DEMOTION_HINT);
      profile.assertNoConfirmationDialog();
      profile.assertDesignation('Volunteer');

      profile.saveDetails();
      notification.assertEquals(MESSAGES.profileSaveSuccess);

      // The demotion happens server side; the page reflects it without a reload
      profile.assertDesignation('Donor');
      profile.assertArchivedChipVisible();

      profile.reloadPage();
      profile.assertArchive(true);
      profile.assertArchivedChipVisible();
      profile.assertDesignation('Donor');
    });
  });

  it('hides the archive switch from a volunteer, whose save still round-trips archiveFlag', () => {
    signInAsSuperAdmin();

    const member = uniqueDonor('Volunteer Viewer', 2);
    const target = uniqueDonor('Volunteer Target', 3);
    createDonor(member, 'volunteerId');
    createDonor(target, 'volunteerTargetId');

    cy.get('@volunteerId').then((volunteerId) => {
      openProfile(String(volunteerId));
      profile.openSettings();
      profile.clickPromoteToVolunteer();
      notification.assertEquals(MESSAGES.promoteVolunteerSuccess);

      signInAsMember(String(volunteerId), member.phone);
    });

    cy.get('@volunteerTargetId').then((targetId) => {
      openProfile(String(targetId));
      profile.assertArchiveSwitchAbsent();

      // archiveFlag is a required body field, so even a save by someone who never sees
      // the switch has to carry the donor's existing value
      cy.intercept('PATCH', '**/donors/v2').as('patchDonor');
      profile.typeAddress('Edited by a volunteer');
      profile.saveDetails();
      cy.wait('@patchDonor').its('request.body.archiveFlag').should('eq', false);
      notification.assertEquals(MESSAGES.profileSaveSuccess);
    });
  });

  it('hides the archive switch from a hall admin', () => {
    signInAsSuperAdmin();

    const member = uniqueDonor('Hall Admin Viewer', 4);
    const target = uniqueDonor('Hall Admin Target', 5);
    createDonor(member, 'hallAdminId');
    createDonor(target, 'hallAdminTargetId');

    cy.get('@hallAdminId').then((hallAdminId) => {
      openProfile(String(hallAdminId));
      profile.openSettings();
      profile.clickPromoteToVolunteer();
      notification.assertEquals(MESSAGES.promoteVolunteerSuccess);
      profile.clickPromoteToHallAdmin();
      notification.assertEquals(MESSAGES.changeHallAdminSuccess);

      signInAsMember(String(hallAdminId), member.phone);
    });

    cy.get('@hallAdminTargetId').then((targetId) => {
      openProfile(String(targetId));
      profile.assertArchiveSwitchAbsent();
    });
  });

  it('keeps an archived donor on Active Donors, chip shown to a volunteer but no switch', () => {
    signInAsSuperAdmin();

    const member = uniqueDonor('Active Donors Viewer', 6);
    const archived = uniqueDonor('Archived Active Donor', 7);
    // Suhrawardy: the Active Donors page loads with that hall hardcoded in its default
    // query, which the backend rejects for a member of any other hall
    createDonor(member, 'activeViewerId', HALL.SUHRAWARDY);
    createDonor(archived, 'archivedActiveId');

    // Mark, then archive: archiving must not remove the activedonors row
    cy.get('@archivedActiveId').then((archivedId) => {
      openProfile(String(archivedId));
      // scrolled into view by hand: the bookmark button sits under the app bar on a
      // freshly opened detail page
      cy.get('[data-cy="personDetailsActiveDonorButtonId"]').scrollIntoView().click({ force: true });
      profile.ensureActiveDonorOn(MESSAGES.markActiveSuccess);
      activeDonors.closeOverlays();
      profile.toggleArchive(true);
      profile.saveDetails();
      notification.assertEquals(MESSAGES.profileSaveSuccess);
      profile.assertArchivedChipVisible();
    });

    cy.get('@activeViewerId').then((viewerId) => {
      openProfile(String(viewerId));
      profile.openSettings();
      profile.clickPromoteToVolunteer();
      notification.assertEquals(MESSAGES.promoteVolunteerSuccess);

      signInAsMember(String(viewerId), member.phone);
    });

    drawer.goToActiveDonors();
    // This volunteer bookmarked nothing — the row was marked by the super admin above — and the
    // page opens on your own bookmarks, so everybody's is what this spec has to ask for.
    activeDonors.showBookmarksFromEveryone();
    activeDonors.assertAnyCardExists();
    activeDonors.expandFirstCard();
    activeDonors.seeProfileOnFirstCard();
    profile.assertSettingsVisible();
    profile.assertArchivedChipVisible();
    profile.assertArchiveSwitchAbsent();
  });
});
