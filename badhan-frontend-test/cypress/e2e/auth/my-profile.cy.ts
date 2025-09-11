import { SignInPage } from '@pages/SignInPage';
import { NotificationComponent } from '@components/Notification';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { BLOOD_GROUP, HALL, MESSAGES, TEST_DATA } from '@support/constants';
import { ProfilePage } from '@pages/ProfilePage';

describe('My Profile - Edit and Save Details', () => {
  const signInPage = new SignInPage();
  const notification = new NotificationComponent();
  const drawer = new NavigationDrawer();
  const profile = new ProfilePage();

  it('signs in, navigates to My Profile, edits all details and saves', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to My Profile via drawer
    drawer.goToMyProfile();

    // Ensure profile page is visible
    profile.assertSettingsVisible();

    // Edit details using data-cy selectors via page object
    profile.typeName(TEST_DATA.updatedName);
    profile.typePhone(TEST_DATA.updatedPhone);
    profile.typeStudentId(TEST_DATA.updatedStudentId);
    profile.typeEmail(TEST_DATA.updatedEmail);
    profile.selectBloodGroup(BLOOD_GROUP.O_POS);
    profile.selectHall(HALL.UNKNOWN);
    profile.typeRoom(TEST_DATA.updatedRoom);
    profile.typeAddress(TEST_DATA.updatedAddress);
    profile.togglePublicData(true);

    // Save
    profile.saveDetails();

    // Assert notification
    notification.assertEquals(MESSAGES.profileSaveSuccess);

    // Reload and assert persistence
    profile.reloadPage();
    profile.assertDetailsPersisted({
      name: TEST_DATA.updatedName,
      phone: TEST_DATA.updatedPhone,
      studentId: TEST_DATA.updatedStudentId,
      email: TEST_DATA.updatedEmail,
      bloodGroupLabel: BLOOD_GROUP.O_POS,
      hallLabel: HALL.UNKNOWN,
      room: TEST_DATA.updatedRoom,
      address: TEST_DATA.updatedAddress,
      publicData: true,
    });
  });
});


