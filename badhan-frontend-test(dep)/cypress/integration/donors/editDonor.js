import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
import {bloodGroups, fakeDonorProfile, halls, routeInfos} from "../../plugins/constants";
describe('Edit Donors', () => {
    it('edit all info of donor and revert back', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        ui.actions.goToMyProfile()
        ui.pages.personDetails.details.nameTextBox.type(fakeDonorProfile.name)
        ui.pages.personDetails.details.phoneTextBox.type(fakeDonorProfile.phone)
        ui.pages.personDetails.details.emailTextBox.type(fakeDonorProfile.email)
        ui.pages.personDetails.details.studentIdTextBox.type(fakeDonorProfile.studentId)
        ui.pages.personDetails.details.addressTextBox.type(fakeDonorProfile.address)
        ui.pages.personDetails.details.hallSelection.click()
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
        ui.pages.personDetails.details.studentIdTextBox.contains(fakeDonorProfile.studentId)
        ui.pages.personDetails.details.commentTextBox.contains(fakeDonorProfile.comment)
        ui.pages.personDetails.details.addressTextBox.contains(fakeDonorProfile.address)
        ui.pages.personDetails.details.publicDataCheckBox.contains(true)

    })})
