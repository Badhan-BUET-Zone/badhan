import { ui } from "."
import env from '../../plugins/env'
import { routeInfos } from "../constants"
export default {
    completeSignIn: ()=>{
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)
    },
    visitFirstPage: ()=>{
        ui.control.start()
    },
    createDonor: (fakeDonorProfile)=>{
        ui.pages.home.isCurrentPage();

        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.donorCreationLink.click()
        ui.components.topBar.drawer.singleDonorCreationLink.click()

        ui.pages.singleDonorCreation.nameTextBox.type(fakeDonorProfile.name)
        ui.pages.singleDonorCreation.phoneTextBox.type(fakeDonorProfile.phone)
        ui.pages.singleDonorCreation.studentIdTextBox.type(fakeDonorProfile.studentId)
        ui.pages.singleDonorCreation.bloodGroupSelection.click()
        ui.pages.singleDonorCreation.bloodGroupSelection.getSelectionMenuByBloodGroup(fakeDonorProfile.bloodGroup).click()
        ui.pages.singleDonorCreation.hallSelection.click()
        ui.pages.singleDonorCreation.hallSelection.getSelectionMenuByHall(fakeDonorProfile.hall).click()
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

        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.homeLink.click()
    }
}