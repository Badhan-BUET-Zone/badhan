import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { HomePage } from '@pages/HomePage';
import { ProfilePage } from '@pages/ProfilePage';

describe('Single Donor Creation', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const home = new HomePage();
  const profile = new ProfilePage();

  it('creates a donor and shows success notification (validated by backend response)', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    // Verify login notification to ensure auth state
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Single Donor Creation via drawer
    drawer.goToSingleDonorCreation();

    // No network intercept; rely on success notification

    // Fill the form (ids from NewPersonCard.vue)
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Test Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605011';

    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });

    // Blood group select via data-cy attribute on Selector
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);

    // Hall select (uses data-cy="hall-select"). A real hall plus Public Data: (Unknown) is no
    // longer offered on this form, and it was silently forcing availableToAll — which is what the
    // Home page's default "Public Data" search below actually matches on.
    newDonor.selectHall(HALL.SUHRAWARDY);
    newDonor.setPublicData(true);

    // Optional fields
    newDonor.fillOptional({ room: '1001', address: 'Test Address', comment: 'Test Comment' });

    // Donation counts and dates
    const lastWholeDonationIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString().slice(0, 10);
    const lastPlateletDonationIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10);

    // Set non-zero counts so dates are required
    newDonor.setDonationCounts({ wholeBloodCount: 2, plateletCount: 1 });

    // Pick corresponding dates via date pickers
    newDonor.setLastDonationDate(lastWholeDonationIso);
    newDonor.setLastPlateletDonationDate(lastPlateletDonationIso);

    // Create
    newDonor.submit();

    // Expect success notification after create completes
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    // Go back to Home and search the created donor
    drawer.goToHome();
    home.setNameFilter(donorName);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donorName);

    // Open donor profile and delete the donor
    home.clickSeeProfileOnFirstCard();
    profile.assertSettingsVisible();
    profile.openSettings();
    profile.clickDeleteDonor();
    notification.assertEquals(MESSAGES.donorDeletedSuccess);
  });

  it('creates a donor with both parents\' names left blank', () => {
    // The two name fields are not required. A volunteer at a desk usually does not know them, and
    // the record they were blocking is worth more than the names — so blank is sent as (Unknown),
    // the same treatment the comment and the CSV import already give.
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToSingleDonorCreation();

    cy.intercept('POST', '**/donors').as('createDonor');

    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `No Parents Donor ${uniqueSuffix}`;
    const donorPhone = `017${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');

    newDonor.fillBasic({
      name: donorName,
      phone: donorPhone,
      studentId: '1605012',
      fatherName: '',
      motherName: '',
    });

    // No asterisk on either field, and no error after touching them — the absence of the
    // `required` class is what a volunteer actually sees.
    cy.get('[data-cy="newDonorFatherNameTextBoxId"]').should('not.have.class', 'required');
    cy.get('[data-cy="newDonorMotherNameTextBoxId"]').should('not.have.class', 'required');

    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(HALL.SUHRAWARDY);
    newDonor.setPublicData(true);
    newDonor.setDonationCounts({ wholeBloodCount: 0, plateletCount: 0 });
    newDonor.submit();

    // The button was not disabled and the request carries (Unknown) rather than an empty string,
    // which is what the server's three-character minimum needs.
    cy.wait('@createDonor').then((interception) => {
      expect(interception.request.body.fatherName).to.equal('(Unknown)');
      expect(interception.request.body.motherName).to.equal('(Unknown)');
    });
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    drawer.goToHome();
    home.setNameFilter(donorName);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donorName);

    home.clickSeeProfileOnFirstCard();
    profile.assertSettingsVisible();
    profile.openSettings();
    profile.clickDeleteDonor();
    notification.assertEquals(MESSAGES.donorDeletedSuccess);
  });
});


