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
    // A real hall, not (Unknown). The edit form still offers (Unknown) — donors/unknown-hall.cy.ts
    // is what covers that — but a record carrying it cannot have its comment edited, and this spec
    // edits the comment below.
    profile.selectHall(HALL.TITUMIR);
    profile.typeRoom(TEST_DATA.updatedRoom);
    profile.typeAddress(TEST_DATA.updatedAddress);
    profile.togglePublicData(true);

    // Edit comment and save using the separate comment save button
    profile.typeComment(TEST_DATA.updatedComment);
    profile.saveComment();
    notification.assertEquals(MESSAGES.commentChangedSuccess);

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
      hallLabel: HALL.TITUMIR,
      room: TEST_DATA.updatedRoom,
      address: TEST_DATA.updatedAddress,
      publicData: true,
    });
    profile.assertComment(TEST_DATA.updatedComment);

    // Revert phone to original and save
    profile.typePhone(AUTH_CREDENTIALS.phone);
    profile.saveDetails();
    notification.assertEquals(MESSAGES.profileSaveSuccess);
  });
});


