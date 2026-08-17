import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { ProfilePage } from '@pages/ProfilePage';
import { CertificateEnabledDonorsPage } from '@pages/CertificateEnabledDonorsPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';

// The Super Admin page listing every donor whose certificate is switched on. The flag itself is an
// ordinary profile checkbox any volunteer or hall admin may tick for a donor they can edit; this
// page is the only place the whole set is visible, which is why reading it is super-admin only.

describe('Certificate Enabled Donors', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const profile = new ProfilePage();
  const certificateEnabled = new CertificateEnabledDonorsPage();

  const uniqueDonor = (label: string) => {
    const suffix = String(Date.now()).slice(-7);
    return {
      name: `${label} ${suffix}`,
      phone: `017${suffix}`.slice(0, 11).padEnd(11, '0'),
      studentId: '1605012',
    };
  };

  const createDonor = (donor: { name: string; phone: string; studentId: string }, alias: string) => {
    cy.visit('/#/singleDonorCreation');
    cy.reload();
    cy.intercept('POST', '**/donors').as(`create_${alias}`);
    newDonor.fillBasic(donor);
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(HALL.SUHRAWARDY);
    newDonor.setDonationCounts({ wholeBloodCount: 0, plateletCount: 0 });
    newDonor.submit();
    notification.assertEquals(MESSAGES.donorCreateSuccess);
    cy.wait(`@create_${alias}`).then((interception) => {
      cy.wrap(interception.response!.body.newDonor._id).as(alias);
    });
  };

  it('lists a donor once their certificate is enabled, and not before', () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    const donor = uniqueDonor('Certificate Listed Donor');
    createDonor(donor, 'certificateDonorId');

    cy.get('@certificateDonorId').then((donorId) => {
      // Absent first. A page that listed every donor would pass the positive assertion below on
      // its own, so the "not before" half is what gives it meaning.
      drawer.goToCertificateEnabledDonors();
      certificateEnabled.assertDonorRowAbsent(donor.name);

      cy.visit(`/#/home/details?id=${String(donorId)}`);
      cy.reload();
      profile.assertSettingsVisible();
      profile.openSettings();
      profile.toggleCertificateEnabled(true);
      profile.saveDetails();
      notification.assertEquals(MESSAGES.profileSaveSuccess);

      // Leave the detail page before touching the drawer: its card is a fixed overlay that covers
      // the app bar, so the hamburger is unclickable from here.
      cy.visit('/#/home');
      drawer.goToCertificateEnabledDonors();
      certificateEnabled.assertTableVisible();
      certificateEnabled.assertDonorRowExists(donor.name);
      certificateEnabled.assertCountAtLeast(1);
    });
  });
});
