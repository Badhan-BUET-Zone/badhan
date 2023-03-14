import { ui } from '../../plugins/frontend'
import {ApiInterceptor} from '../../plugins/backend'
import env from '../../plugins/env'

describe('Donor Creation', () => {
    it('should create new donor, get donor, promote to volunteer, check volunteer, demote to donor and delete donor', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        ui.pages.home.filter.nameTextBox.type("Random Donor Name")
        ui.pages.home.filter.publicDataRadioButton.click()
        ui.pages.home.filter.notAvailableCheckbox.click()

        const searchInterceptorToCheckForExisting = new ApiInterceptor('GET','/search/v3*')
        ui.pages.home.filter.searchButton.click()
        searchInterceptorToCheckForExisting.wait().then(result => {
            //if the donor already was created
            if(result.response.body.filteredDonors.length !== 0){
                ui.pages.home.searchResult.personCards.getByIndex(0).click()
                ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
                ui.pages.personDetails.settings.expansionButton.click()
                ui.pages.personDetails.settings.expansion.deleteButton.click()
                ui.components.confirmationModal.okButton.click()
                ui.components.notificationSnackBar.contains('Deleted donor successfully')
            }

            //proceed to create donor
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.donorCreationLink.click()
            ui.components.topBar.drawer.singleDonorCreationLink.click()
            ui.pages.singleDonorCreation.nameTextBox.type("Random Donor Name")
            ui.pages.singleDonorCreation.phoneTextBox.type("01311113278")
            ui.pages.singleDonorCreation.studentIdTextBox.type("1605489")
            ui.pages.singleDonorCreation.bloodGroupSelection.click()
            ui.pages.singleDonorCreation.bloodGroupSelection.getSelectionMenuByBloodGroup('AB+').click()
            ui.pages.singleDonorCreation.roomNumberTextBox.type("Random Room Number")
            ui.pages.singleDonorCreation.addressTextBox.type("Random Address")
            ui.pages.singleDonorCreation.commentTextBox.type("Random Comment")
            ui.pages.singleDonorCreation.donationCountTextBox.type("1")
            ui.pages.singleDonorCreation.publicDataCheckBox.click()
            ui.pages.singleDonorCreation.donationDateField.click()
            ui.pages.singleDonorCreation.donationDatePicker.sampleDate.click()
            ui.pages.singleDonorCreation.donationDatePicker.okButton.click()
            ui.pages.singleDonorCreation.donorCreationButton.click()
            ui.components.notificationSnackBar.contains('Donor added successfully')

            //search the created donor
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.homeLink.click()
            ui.pages.home.filter.nameTextBox.type("random")
            ui.pages.home.filter.publicDataRadioButton.click()
            ui.pages.home.filter.notAvailableCheckbox.click()
            ui.pages.home.filter.searchButton.click()
            ui.pages.home.searchResult.personCards.getByIndex(0).click()
            ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()

            // promote the new donor
            ui.pages.personDetails.settings.expansionButton.click()
            ui.pages.personDetails.settings.expansion.promoteToVolunteerButton.click()
            ui.components.notificationSnackBar.contains("Target user promoted/demoted successfully")

            // check whether promotion was successful
            ui.pages.personDetails.pageTitle.backButton.click()
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.membersLink.click()
            ui.pages.members.volunteers.check("Random Donor Name")

            // search the promoted donor again
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.homeLink.click()
            ui.pages.home.filter.nameTextBox.type("Random Donor Name")
            ui.pages.home.filter.publicDataRadioButton.click()
            ui.pages.home.filter.notAvailableCheckbox.click()
            ui.pages.home.filter.searchButton.click()
            ui.pages.home.searchResult.personCards.getByIndex(0).click()
            ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
            ui.control.wait(500)

            // demote the donor
            ui.pages.personDetails.settings.expansionButton.click()
            ui.pages.personDetails.settings.expansion.demoteToDonorButton.click()
            ui.components.notificationSnackBar.contains("Target user promoted/demoted successfully")

            //delete the donor
            ui.pages.personDetails.settings.expansion.deleteButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains('Deleted donor successfully')

            // sign out
            ui.control.scroll.top()
            ui.components.topBar.tripleDotButton.click()
            ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
            ui.components.confirmationModal.okButton.click()
        })
    })
})
