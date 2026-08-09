import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { NewlyCreatedDonorsPage } from '@pages/NewlyCreatedDonorsPage';
// removed network intercepts; rely on UI rendering instead
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';

describe('Newly Created Donors', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const newlyCreated = new NewlyCreatedDonorsPage();

  it('shows at least one donor after fetching newly created donors', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Ensure we have at least one fresh donor by creating one quickly
    drawer.goToSingleDonorCreation();

    // No network intercept; rely on notification

    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `E2E New Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605012';

    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });

    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);

    // (Unknown) is no longer offered on this form: a new record must name a hall.
    newDonor.selectHall(HALL.SUHRAWARDY);

    newDonor.setDonationCounts({ wholeBloodCount: 0, plateletCount: 0 });
    newDonor.submit();

    // Expect success notification for donor creation
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    // Navigate to Newly Created Donors page
    drawer.goToNewlyCreatedDonors();

    // Fetch newly created donors (UI rendering awaited)
    newlyCreated.fetch();

    // Assert at least one donor card rendered
    newlyCreated.assertAnyDonorCardExists();
  });
});


