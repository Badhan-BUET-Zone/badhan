import { ui } from "../../plugins/frontend";
import { ApiInterceptor } from "../../plugins/backend";

import env from '../../plugins/env'
import {routeInfos} from "../../plugins/constants";
describe('Call Records', () => {
    it('should create and delete a call record',() => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        // search random donor
        ui.pages.home.filter.nameTextBox.type("mr")
        ui.pages.home.filter.publicDataRadioButton.click()
        ui.pages.home.filter.notAvailableCheckbox.click()
        const searchInterceptor = new ApiInterceptor(routeInfos.GETSearch)
        ui.pages.home.filter.searchButton.click()
        searchInterceptor.wait().then(result => {
            // get call record count and check
            const searchResultBody = result.response.body
            const sampleDonorId = searchResultBody.filteredDonors[0]._id
            const previousCallCount = searchResultBody.filteredDonors[0].callRecordCount
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).click()
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).expansion.callCountText.contains(String(previousCallCount))
            
            // create new call and check
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).expansion.callButton.click()
            ui.components.notificationSnackBar.contains("Added call record")
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).click()
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).expansion.callCountText.contains(String(previousCallCount+1))

            // delete call record
            ui.pages.home.searchResult.personCards.getByDonorId(sampleDonorId).expansion.seeProfileButton.click()
            ui.pages.personDetails.callRecords.expansionButton.click()
            ui.pages.personDetails.callRecords.getByIndex(0).deleteButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains('Successfully deleted call record')

            // signout
            ui.pages.personDetails.pageTitle.backButton.click()
            ui.components.topBar.tripleDotButton.click()
            ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains("Logged out successfully")
        })
    })})
