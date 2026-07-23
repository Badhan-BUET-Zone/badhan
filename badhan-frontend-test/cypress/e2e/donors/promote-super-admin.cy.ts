import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { HomePage } from '@pages/HomePage';
import { ProfilePage } from '@pages/ProfilePage';

describe('Promote donor to Super Admin then demote back', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const home = new HomePage();
  const profile = new ProfilePage();

  it('promotes a volunteer to super admin, persists across reload, then demotes to volunteer', () => {
    // Sign in as the seeded super admin
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Create a donor in a valid hall so designation changes are allowed
    drawer.goToSingleDonorCreation();
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Super Admin Candidate ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605013';

    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(HALL.AHSANULLAH);
    newDonor.fillOptional({ room: 'B-203', address: 'Promotion Street', comment: 'Promote to super admin' });
    newDonor.setPublicData(true);
    newDonor.submit();
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    // Open the donor's profile
    drawer.goToHome();
    home.setNameFilter(donorName);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donorName);
    home.clickSeeProfileOnFirstCard();
    profile.assertSettingsVisible();
    profile.openSettings();

    // Promotion to super admin is only offered once the donor is a volunteer
    profile.clickPromoteToVolunteer();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);
    profile.assertDesignation('Volunteer');

    // Promote to super admin
    profile.promoteToSuperAdmin();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);
    profile.assertDesignation('Super Admin');

    // Reload: the Super Admin label persists and the button has flipped to "Demote to Volunteer"
    profile.reloadPage();
    profile.assertDesignation('Super Admin');
    profile.openSettings();
    profile.assertPromoteToSuperAdminAbsent();
    profile.assertDemoteFromSuperAdminVisible();

    // Demote back to volunteer
    profile.demoteFromSuperAdmin();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);
    profile.assertDesignation('Volunteer');
  });
});
