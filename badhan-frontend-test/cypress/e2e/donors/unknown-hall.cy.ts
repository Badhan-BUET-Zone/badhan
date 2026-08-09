import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { HomePage } from '@pages/HomePage';
import { ProfilePage } from '@pages/ProfilePage';

// (Unknown) is a legacy value: no form may produce it, and every record that already holds it stays
// usable. These specs cover both halves — the dropdown that no longer offers it, and the profile of
// a donor that still carries it.

describe('Unknown hall', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const home = new HomePage();
  const profile = new ProfilePage();

  const signIn = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
  };

  // A donor created with a real hall and then edited to (Unknown) — the only way such a record can
  // come into being now, and the shape of every one that predates the rule.
  const createDonorThenMoveToUnknownHall = (donorName: string, phone: string) => {
    drawer.goToSingleDonorCreation();
    newDonor.fillBasic({ name: donorName, phone, studentId: '1605011' });
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(HALL.SUHRAWARDY);
    // Public Data so the Home page's default "Public Data" search finds it below.
    newDonor.setPublicData(true);
    newDonor.setDonationCounts({ wholeBloodCount: 0, plateletCount: 0 });
    newDonor.submit();
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    drawer.goToHome();
    home.setNameFilter(donorName);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donorName);
    home.clickSeeProfileOnFirstCard();

    // The edit form still offers (Unknown): PATCH /donors still accepts it, so an existing record
    // stays editable and archivable.
    profile.selectHall(HALL.UNKNOWN);
    profile.saveDetails();
  };

  it('does not offer Unknown on the donor creation form', () => {
    signIn();
    drawer.goToSingleDonorCreation();

    cy.get('[data-cy="hall-select"]').click();
    cy.get('[data-cy="hall-selectSuhrawardy"]').should('exist');
    cy.get('[data-cy="hall-select(Unknown)"]').should('not.exist');
    cy.get('[data-cy="hall-selectAttached"]').should('not.exist');
  });

  it('disables the comment box on a donor whose hall is Unknown', () => {
    signIn();

    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Unknown Hall Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');

    createDonorThenMoveToUnknownHall(donorName, donorPhone);

    // The backend refuses the same write with a 409; this is what stops the user reaching it.
    cy.get('[data-cy="donorDetailsCommentTextBoxId"]').should('be.disabled');
    cy.get('[data-cy="donorDetailsCommentSaveButtonId"]').should('be.disabled');
    cy.contains('Set this donor\'s hall before adding a comment').should('be.visible');

    // Picking a real hall re-enables it before the save — the box tracks the form, not the record.
    profile.selectHall(HALL.TITUMIR);
    cy.get('[data-cy="donorDetailsCommentTextBoxId"]').should('not.be.disabled');
    cy.get('[data-cy="donorDetailsCommentSaveButtonId"]').should('not.be.disabled');

    // Clean up.
    profile.saveDetails();
    profile.assertSettingsVisible();
    profile.openSettings();
    profile.clickDeleteDonor();
    notification.assertEquals(MESSAGES.donorDeletedSuccess);
  });
});
