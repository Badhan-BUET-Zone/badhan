import env from '../../plugins/env'
import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";
describe('Change password', () => {
    it('should change password and check', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)

        // change password
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.myProfileLink.click()
        ui.pages.personDetails.settings.expansionButton.click()
        ui.pages.personDetails.settings.expansion.newPasswordTextBox.type('123456789')
        ui.pages.personDetails.settings.expansion.confirmPasswordTextBox.type('123456789')
        ui.pages.personDetails.settings.expansion.changePasswordButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.PATCHUsersPassword.notification)

        // sign out
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        
        // login with new password
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type('123456789')
        ui.pages.signIn.signInButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)
        
        // go to my profile
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.myProfileLink.click()
        ui.control.wait(500)
        
        // changee password back
        ui.pages.personDetails.settings.expansionButton.click()
        ui.pages.personDetails.settings.expansion.newPasswordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.personDetails.settings.expansion.confirmPasswordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.personDetails.settings.expansion.changePasswordButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.PATCHUsersPassword.notification)

        // signout
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
    })
})
