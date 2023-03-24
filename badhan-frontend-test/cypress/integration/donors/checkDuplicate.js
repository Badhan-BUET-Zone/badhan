import env from '../../plugins/env'
import {ui} from '../../plugins/frontend'
import {fakeDonorProfile, routeInfos, seeDuplicateProfileTimeout} from "../../plugins/constants";

describe('Duplicate Donors', () => {
    it('should check whether the phone already exists in donor creation form', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        // go to single donor creation page
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.donorCreationLink.click()
        ui.components.topBar.drawer.singleDonorCreationLink.click()

        // type donor phone and click to see duplicate donor
        ui.pages.singleDonorCreation.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.singleDonorCreation.nameTextBox.type(fakeDonorProfile.name)
        ui.pages.singleDonorCreation.seeDuplicateButton.click()
        ui.control.wait(seeDuplicateProfileTimeout)

        // signout
        ui.control.scroll.top()
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
    }
)})
