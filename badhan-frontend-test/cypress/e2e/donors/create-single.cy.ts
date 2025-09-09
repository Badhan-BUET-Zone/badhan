import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { interceptRoutes, waitFor } from '@support/routes';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';

// Frontend shows this on successful donor create
const CREATE_SUCCESS_MESSAGE = 'Donor added successfully';

describe('Single Donor Creation', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();

  it('creates a donor and shows success notification (validated by backend response)', () => {
    // Sign in
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    // Verify login notification to ensure auth state
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Single Donor Creation via drawer
    drawer.goToSingleDonorCreation();

    // Observe backend call
    interceptRoutes.createDonor();

    // Fill the form (ids from NewPersonCard.vue)
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Test Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605011';

    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });

    // Blood group select via data-cy attribute on Selector
    newDonor.selectBloodGroup(BLOOD_GROUP.A_POS);

    // Hall select (uses data-cy="hall-select")
    newDonor.selectHall(HALL.UNKNOWN);

    // Optional fields
    newDonor.fillOptional({ room: '1001', address: 'Test Address', comment: 'Test Comment' });

    // Donation counts and dates (keep zero to avoid date requirement)
    newDonor.setDonationCounts({ wholeBloodCount: 0, plateletCount: 0 });

    // Create
    newDonor.submit();

    // Backend response should be 201
    waitFor.createDonorOk();

    // Expect success notification
    notification.assertEquals(MESSAGES.donorCreateSuccess);
  });
});


