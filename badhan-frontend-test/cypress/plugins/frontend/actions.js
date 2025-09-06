import { ui } from "."
import env from '../../plugins/env'
import { routeInfos } from "../constants"
import { ApiInterceptor } from '../backend'
export default {
    completeSignIn: (phone = env.SUPERADMIN_PHONE, password = env.SUPERADMIN_PASSWORD)=>{
        ui.pages.signIn.phoneTextBox.type(phone)
        ui.pages.signIn.passwordTextBox.type(password)
        ui.pages.signIn.signInButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)
    },
    visitFirstPage: ()=>{
        ui.control.start()
    },
    createDonor: (donorProfile)=>{
        ui.pages.home.isCurrentPage();

        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.donorCreationLink.click()
        ui.components.topBar.drawer.singleDonorCreationLink.click()

        ui.pages.singleDonorCreation.nameTextBox.type(donorProfile.name)
        ui.pages.singleDonorCreation.phoneTextBox.type(donorProfile.phone)
        ui.pages.singleDonorCreation.studentIdTextBox.type(donorProfile.studentId)
        ui.pages.singleDonorCreation.bloodGroupSelection.click()
        ui.pages.singleDonorCreation.bloodGroupSelection.getSelectionMenuByBloodGroup(donorProfile.bloodGroup).click()
        // ui.pages.singleDonorCreation.hallSelection.click()
        // ui.pages.singleDonorCreation.hallSelection.getSelectionMenuByHall(donorProfile.hall).click()
        ui.pages.singleDonorCreation.roomNumberTextBox.type(donorProfile.roomNumber)
        ui.pages.singleDonorCreation.addressTextBox.type(donorProfile.address)
        ui.pages.singleDonorCreation.commentTextBox.type(donorProfile.comment)
        ui.pages.singleDonorCreation.donationCountTextBox.type(donorProfile.donationCount)
        ui.pages.singleDonorCreation.publicDataCheckBox.click()

        ui.pages.singleDonorCreation.donationDateField.click()
        ui.pages.singleDonorCreation.donationDatePicker.sampleDate.click()
        ui.pages.singleDonorCreation.donationDatePicker.okButton.click()
        ui.pages.singleDonorCreation.donorCreationButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.POSTDonors.notification)

        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.homeLink.click()
    },
    searchDonor: (searchOptions)=>{
        ui.pages.home.isCurrentPage()
        ui.pages.home.filter.nameTextBox.type(searchOptions.name)
        // ui.pages.home.filter.bloodGroupSelect(searchOptions.bloodGroup).click()
        ui.pages.home.filter.batchTextBox.type(searchOptions.batch)
        if(searchOptions.address !== null){
            ui.pages.home.filter.addressTextBox.type(searchOptions.address)
        }
        if (searchOptions.publicData === true){
            ui.pages.home.filter.publicDataRadioButton.click()
        }
        if(searchOptions.specifyHall === true){
            ui.pages.home.filter.specifyHallRadioButton.click()
            ui.pages.home.filter.hallSelect(searchOptions.hall).click()
        }
        if(searchOptions.available === true){
            ui.pages.home.filter.availableCheckBox.check()
        }
        else{
            ui.pages.home.filter.availableCheckBox.uncheck()
        }
        if(searchOptions.notAvailable === true){
            ui.pages.home.filter.notAvailableCheckbox.check()
        }else{
            ui.pages.home.filter.notAvailableCheckbox.uncheck()
        }

        ui.pages.home.filter.searchButton.click()
    },
    goToMyProfile: ()=>{
        ui.components.topBar.drawerButton.click()
        const interceptor = new ApiInterceptor(routeInfos.GETDonors)
        ui.components.topBar.drawer.myProfileLink.click()
        interceptor.wait()
    },
    markActiveDonor: ()=>{
        ui.pages.personDetails.activeDonorButton.click()
        ui.pages.personDetails.activeDonorButton.activeDonorSwitch.click()
        ui.components.notificationSnackBar.contains(routeInfos.POSTActiveDonors.notification)
    },
    unmarkActiveDonor: ()=>{
        ui.pages.personDetails.activeDonorButton.click()
        ui.pages.personDetails.activeDonorButton.activeDonorSwitch.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETEActiveDonors.notification)
    },
    changePassword: (newPassword)=>{
        ui.control.wait(1000)
        ui.pages.personDetails.settings.expansionButton.click()
        ui.pages.personDetails.settings.expansion.newPasswordTextBox.type(newPassword)
        ui.pages.personDetails.settings.expansion.confirmPasswordTextBox.type(newPassword)
        ui.pages.personDetails.settings.expansion.changePasswordButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.PATCHUsersPassword.notification)
    },
    signOut: ()=>{
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
    },
    goToActiveDonors: ()=>{
        ui.components.topBar.drawerButton.click()
        const interceptor = new ApiInterceptor(routeInfos.GETActiveDonors)
        ui.components.topBar.drawer.activeDonorLink.click()
        interceptor.wait()
    }
}