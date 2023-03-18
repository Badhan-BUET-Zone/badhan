import { ui } from '../../plugins/frontend'
import {ApiInterceptor} from '../../plugins/backend'
import env from '../../plugins/env'
import { routeInfos, fakeDonorProfile } from '../../plugins/constants'

describe('Donor Creation', () => {
    it('should create new donor, get donor, promote to volunteer, check volunteer, demote to donor and delete donor', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        ui.pages.home.filter.nameTextBox.type(fakeDonorProfile.name)
        ui.pages.home.filter.publicDataRadioButton.click()
        ui.pages.home.filter.notAvailableCheckbox.click()

        const searchInterceptorToCheckForExisting = new ApiInterceptor(
            routeInfos.GETSearch)
        ui.pages.home.filter.searchButton.click()
        searchInterceptorToCheckForExisting.wait().then(result => {
            //if the donor already was created
            if(result.response.body.filteredDonors.length !== 0){
                ui.pages.home.searchResult.personCards.getByIndex(0).click()
                ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
                ui.pages.personDetails.settings.expansionButton.click()
                ui.pages.personDetails.settings.expansion.deleteButton.click()
                ui.components.confirmationModal.okButton.click()
                ui.components.notificationSnackBar.contains(routeInfos.DELETEDonors.notification)
            }

            //proceed to create donor
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.donorCreationLink.click()
            ui.components.topBar.drawer.singleDonorCreationLink.click()
            ui.pages.singleDonorCreation.nameTextBox.type(fakeDonorProfile.name)
            ui.pages.singleDonorCreation.phoneTextBox.type(fakeDonorProfile.phone)
            ui.pages.singleDonorCreation.studentIdTextBox.type(fakeDonorProfile.studentId)
            ui.pages.singleDonorCreation.bloodGroupSelection.click()
            ui.pages.singleDonorCreation.bloodGroupSelection.getSelectionMenuByBloodGroup(fakeDonorProfile.bloodGroup).click()
            ui.pages.singleDonorCreation.roomNumberTextBox.type(fakeDonorProfile.roomNumber)
            ui.pages.singleDonorCreation.addressTextBox.type(fakeDonorProfile.address)
            ui.pages.singleDonorCreation.commentTextBox.type(fakeDonorProfile.comment)
            ui.pages.singleDonorCreation.donationCountTextBox.type(fakeDonorProfile.donationCount)
            ui.pages.singleDonorCreation.publicDataCheckBox.click()
            ui.pages.singleDonorCreation.donationDateField.click()
            ui.pages.singleDonorCreation.donationDatePicker.sampleDate.click()
            ui.pages.singleDonorCreation.donationDatePicker.okButton.click()
            ui.pages.singleDonorCreation.donorCreationButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.POSTDonors.notification)

            //search the created donor
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.homeLink.click()
            ui.pages.home.filter.nameTextBox.type(fakeDonorProfile.name)
            ui.pages.home.filter.publicDataRadioButton.click()
            ui.pages.home.filter.notAvailableCheckbox.click()
            ui.pages.home.filter.searchButton.click()
            ui.pages.home.searchResult.personCards.getByIndex(0).click()
            const interceptor1 = new ApiInterceptor(routeInfos.GETDonors)
            ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
            interceptor1.wait()

            // promote the new donor
            
            ui.pages.personDetails.settings.expansionButton.click()
            ui.pages.personDetails.settings.expansion.promoteToVolunteerButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonorsDesignation.notification)

            // check whether promotion was successful
            ui.pages.personDetails.pageTitle.backButton.click()
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.membersLink.click()
            ui.pages.members.volunteers.contains(fakeDonorProfile.name)

            // search the promoted donor again
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.homeLink.click()
            ui.pages.home.filter.nameTextBox.type(fakeDonorProfile.name)
            ui.pages.home.filter.publicDataRadioButton.click()
            ui.pages.home.filter.notAvailableCheckbox.click()
            ui.pages.home.filter.searchButton.click()
            ui.pages.home.searchResult.personCards.getByIndex(0).click()
            const interceptor2 = new ApiInterceptor(routeInfos.GETDonors)
            ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
            interceptor2.wait()

            // demote the donor
            ui.pages.personDetails.settings.expansionButton.click()
            ui.pages.personDetails.settings.expansion.demoteToDonorButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonorsDesignation.notification)

            //delete the donor
            ui.pages.personDetails.settings.expansion.deleteButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETEDonors.notification)

            // sign out
            ui.control.scroll.top()
            ui.components.topBar.tripleDotButton.click()
            ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
        })
    })
})
