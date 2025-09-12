import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { HomePage } from '@pages/HomePage';
import { ProfilePage } from '@pages/ProfilePage';

describe('Promote donor to Volunteer then Hall Admin', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const home = new HomePage();
  const profile = new ProfilePage();

  it('creates a donor, opens profile, promotes to volunteer, demotes, promotes again, then hall admin', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Single Donor Creation via drawer
    drawer.goToSingleDonorCreation();

    // Unique donor identity
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Promotable Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605012';

    // Fill and create donor (ensure valid hall so promotions are allowed)
    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);
    newDonor.selectHall(HALL.AHSANUALLAH);
    newDonor.fillOptional({ room: 'B-202', address: 'Promotion Street', comment: 'Promote this donor' });
    newDonor.setPublicData(true);
    newDonor.submit();

    // Expect success notification after create completes
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    // Go back to Home and search donor
    drawer.goToHome();
    home.setNameFilter(donorName);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donorName);

    // Open donor profile
    home.clickSeeProfileOnFirstCard();
    profile.assertSettingsVisible();
    profile.openSettings();

    // Promote to Volunteer and assert notification
    profile.clickPromoteToVolunteer();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);

    // Demote back to Donor and assert notification
    profile.clickDemoteToDonor();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);

    // Promote to Volunteer again and assert notification
    profile.clickPromoteToVolunteer();
    notification.assertEquals(MESSAGES.promoteVolunteerSuccess);

    // Finally promote to Hall Admin and assert notification
    profile.clickPromoteToHallAdmin();
    notification.assertEquals(MESSAGES.changeHallAdminSuccess);
  });
});


