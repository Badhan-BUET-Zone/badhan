import { ui} from "../../plugins/frontend";
import env from '../../plugins/env'
describe('Donations', () => {
    it('should create a donation from person card', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        // search for random donor
        ui.pages.home.filter.nameTextBox.type("mr")
        ui.pages.home.filter.publicDataRadioButton.click()
        ui.pages.home.filter.notAvailableCheckbox.click()
        ui.pages.home.filter.searchButton.click()

        // add a donation
        ui.pages.home.searchResult.personCards.getByIndex(0).click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDateField.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDatePicker.sampleDate.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDatePicker.okButton.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donateButton.click()
        ui.components.notificationSnackBar.contains("Successfully added donation")

        // see full profile and delete first donation
        ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
        ui.pages.personDetails.donationHistory.expansionButton.click()
        ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains("Successfully deleted donation")

        // create new donation from profile page
        ui.pages.personDetails.donationDateField.click()
        ui.pages.personDetails.donationDatePicker.sampleDate.click()
        ui.pages.personDetails.donationDatePicker.okButton.click()
        ui.pages.personDetails.donateButton.click()
        ui.components.notificationSnackBar.contains("Added donation")

        // delete the new donation by picking the first donation
        ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains("Successfully deleted donation")

        // signout
        ui.pages.personDetails.pageTitle.backButton.click()
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains("Logged out successfully")
    })})
