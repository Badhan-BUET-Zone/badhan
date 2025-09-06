import { ui} from "../../plugins/frontend";
import {routeInfos} from "../../plugins/constants";
describe('Donations', () => {
    it('should create a donation from person card', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        // search for random donor
        ui.pages.home.filter.nameTextBox.type("a")
        ui.pages.home.filter.publicDataRadioButton.click()
        ui.pages.home.filter.notAvailableCheckbox.check()
        ui.pages.home.filter.searchButton.click()

        // add a donation
        ui.control.wait(1000)
        ui.pages.home.searchResult.personCards.getByIndex(0).click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDateField.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDatePicker.sampleDate.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donationDatePicker.okButton.click()
        ui.pages.home.searchResult.personCards.getByIndex(0).donateButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.POSTDonations.notification)

        // see full profile and delete first donation
        ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
        ui.control.wait(1000)
        ui.pages.personDetails.donationHistory.expansionButton.click()
        ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETEDonations.notification)

        // create new donation from profile page
        ui.pages.personDetails.donationDateField.click()
        ui.pages.personDetails.donationDatePicker.sampleDate.click()
        ui.pages.personDetails.donationDatePicker.okButton.click()
        ui.pages.personDetails.donateButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.POSTDonations.notification)

        // delete the new donation by picking the first donation
        ui.pages.personDetails.donationHistory.getByIndex(0).deleteButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETEDonations.notification)
    })})
