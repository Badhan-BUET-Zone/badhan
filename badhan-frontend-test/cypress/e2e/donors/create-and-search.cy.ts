import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { NewDonorPage } from '@pages/NewDonorPage';
import { BLOOD_GROUP, HALL, MESSAGES } from '@support/constants';
import { HomePage } from '@pages/HomePage';

describe('Create donor and find via search', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const newDonor = new NewDonorPage();
  const home = new HomePage();

  it('creates a donor and finds it by setting filters then triggering search', () => {
    // Sign in and verify
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);

    // Navigate to Single Donor Creation via drawer
    drawer.goToSingleDonorCreation();

    // Unique donor identity
    const uniqueSuffix = String(Date.now()).slice(-7);
    const donorName = `Searchable Donor ${uniqueSuffix}`;
    const donorPhone = `016${uniqueSuffix.slice(-8, -1)}`.slice(0, 11).padEnd(11, '0');
    const studentId = '1605011';

    // Fill and create donor
    newDonor.fillBasic({ name: donorName, phone: donorPhone, studentId });
    newDonor.selectBloodGroup(BLOOD_GROUP.O_POS);
    newDonor.selectHall(HALL.UNKNOWN);
    newDonor.fillOptional({ room: 'C-101', address: 'Search Street', comment: 'Searchable donor' });
    newDonor.submit();

    // Expect success notification after create completes
    notification.assertEquals(MESSAGES.donorCreateSuccess);

    // Go back to Home
    drawer.goToHome();

    // Set filters individually
    home.setNameFilter(donorName);
    home.setBloodGroupFilter(BLOOD_GROUP.O_POS);
    home.setBatchFilter('16');
    home.setAddressFilter('Search');
    home.setPublicDataRadio(); // use AvailableToAll
    home.setAvailableCheckbox(true);
    home.setNotAvailableCheckbox(false);

    // Trigger search separately
    home.triggerSearch();

    // Assert the donor appears in person cards
    home.assertDonorCardWithNameExists(donorName);
  });
});


