import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { NotificationComponent } from '@components/Notification';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { HomePage } from '@pages/HomePage';
import { MESSAGES } from '@support/constants';
import { CsvDonorCreationPage } from '@pages/CsvDonorCreationPage';
import { generateDonors, donorsToCsv } from '@support/helpers/donorCsvGenerator';

describe('CSV Donor Upload', () => {
  const signInPage = new SignInPage();
  const drawer = new NavigationDrawer();
  const notification = new NotificationComponent();
  const home = new HomePage();
  const csvPage = new CsvDonorCreationPage();

  const signIn = () => {
    signInPage.signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
    notification.assertEquals(MESSAGES.signInSuccess);
    drawer.goToCsvDonorCreation();
  };

  it('uploads a CSV of new donors and creates them all', () => {
    signIn();

    const donors = generateDonors(5);
    csvPage.selectFile(donorsToCsv(donors));

    // After parse + pre-flight, all five are new -> Table 1; nothing broken, nothing existing.
    csvPage.assertToCreateCount(5);
    csvPage.assertNoErrorTable();

    csvPage.uploadAll();

    // Every row reaches "created" and moves into the existing-donors table.
    csvPage.assertAllCreated(5);

    // Verify one really exists by searching it on the home page.
    drawer.goToHome();
    home.setNameFilter(donors[0].name);
    home.triggerSearch();
    home.assertDonorCardWithNameExists(donors[0].name);
  });

  it('routes malformed rows to the error table and never uploads them', () => {
    signIn();

    const donors = generateDonors(3);
    donors[1].phone = '8801712345678'; // 13-digit form, not the required 11-digit 01XXXXXXXXX
    donors[2].bloodGroup = 'XY'; // not a recognised blood group
    csvPage.selectFile(donorsToCsv(donors));

    // One valid row to create; the two malformed rows land in the error table with inline errors.
    csvPage.assertToCreateCount(1);
    csvPage.assertErrorRowCount(2);
    csvPage.assertInlineError('not a valid Bangladeshi number');
    csvPage.assertInlineError('not a recognised blood group');

    csvPage.uploadAll();

    // Only the single valid row uploaded; the malformed rows stay in the error table.
    csvPage.assertExistingCount(1);
    csvPage.assertErrorRowCount(2);
  });

  it('detects already-existing donors and offers a See Donor button', () => {
    signIn();

    const donors = generateDonors(3);
    const csv = donorsToCsv(donors);

    // First upload creates them.
    csvPage.selectFile(csv);
    csvPage.assertToCreateCount(3);
    csvPage.uploadAll();
    csvPage.assertAllCreated(3);

    // Re-selecting the same file fully resets and re-runs; the pre-flight now finds all three
    // in the database, so they land in the existing-donors table with nothing left to create.
    csvPage.selectFile(csv);
    csvPage.assertExistingCount(3);
    csvPage.assertToCreateCount(0);
    csvPage.assertSeeDonorButtonExists();
  });
});
