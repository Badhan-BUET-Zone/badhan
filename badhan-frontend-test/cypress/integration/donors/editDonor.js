import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
import {bloodGroups, fakeDonorProfile, halls, routeInfos} from "../../plugins/constants";
import { ApiInterceptor } from '../../plugins/backend';
describe('Edit Donors', () => {
    it('edit all info of donor and revert back', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        new ApiInterceptor(routeInfos.GETUsersMe).wait().then((result)=>{
        //edit all information of person details
            const donor = result.response.body.donor
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.myProfileLink.click()
            ui.pages.personDetails.details.nameTextBox.type(fakeDonorProfile.name)
            ui.pages.personDetails.details.phoneTextBox.type(fakeDonorProfile.phone)
            ui.pages.personDetails.details.emailTextBox.type(fakeDonorProfile.email)
            ui.pages.personDetails.details.bloodGroupSelection.click()
            const anyOtherBloodGroup = bloodGroups[bloodGroups.length - donor.bloodGroup -1]
            ui.pages.personDetails.details.bloodGroupSelection.getSelectionMenuByBloodGroup(anyOtherBloodGroup).click()
            ui.pages.personDetails.details.studentIdTextBox.type(fakeDonorProfile.studentId)
            ui.pages.personDetails.details.addressTextBox.type(fakeDonorProfile.address)
            ui.pages.personDetails.details.hallSelection.click()
            const anyOtherHall = halls[donor.hall === 0?1:0]
            ui.pages.personDetails.details.hallSelection.getSelectionMenuByHallName(anyOtherHall).click()
            ui.pages.personDetails.details.publicDataCheckBox.click()
            ui.pages.personDetails.details.saveButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonors.notification)
            ui.pages.personDetails.details.commentTextBox.type(fakeDonorProfile.comment)
            ui.pages.personDetails.details.saveCommentButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonorsComment.notification)

            // check that all editted information are persistent
            ui.control.reload()
            ui.pages.personDetails.details.nameTextBox.contains(fakeDonorProfile.name)
            ui.pages.personDetails.details.phoneTextBox.contains(fakeDonorProfile.phone)
            ui.pages.personDetails.details.emailTextBox.contains(fakeDonorProfile.email)
            ui.pages.personDetails.details.bloodGroupSelection.contains(anyOtherBloodGroup)
            ui.pages.personDetails.details.studentIdTextBox.contains(fakeDonorProfile.studentId)
            ui.pages.personDetails.details.commentTextBox.contains(fakeDonorProfile.comment)
            ui.pages.personDetails.details.addressTextBox.contains(fakeDonorProfile.address)
            ui.pages.personDetails.details.hallSelection.contains(anyOtherHall)
            ui.pages.personDetails.details.publicDataCheckBox.contains(true)

            //revert back edits
            ui.pages.personDetails.details.nameTextBox.type(donor.name)
            ui.pages.personDetails.details.phoneTextBox.type(String(donor.phone).substring(2))
            ui.pages.personDetails.details.emailTextBox.type(donor.email)
            ui.pages.personDetails.details.bloodGroupSelection.click()
            ui.pages.personDetails.details.bloodGroupSelection.getSelectionMenuByBloodGroup(bloodGroups[donor.bloodGroup]).click()
            ui.pages.personDetails.details.studentIdTextBox.type(donor.studentId)
            ui.pages.personDetails.details.addressTextBox.type(donor.address)
            ui.pages.personDetails.details.hallSelection.click()
            ui.pages.personDetails.details.hallSelection.getSelectionMenuByHallName(halls[donor.hall]).click()
            ui.pages.personDetails.details.publicDataCheckBox.unClick()
            ui.pages.personDetails.details.saveButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonors.notification)
            ui.pages.personDetails.details.commentTextBox.type(donor.comment)
            ui.pages.personDetails.details.saveCommentButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.PATCHDonorsComment.notification)

            // sign out
            ui.control.scroll.top()
            ui.components.topBar.tripleDotButton.click()
            ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
        })
    })})
