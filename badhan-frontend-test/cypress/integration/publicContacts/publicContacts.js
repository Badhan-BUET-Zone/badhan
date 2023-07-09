import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
import {routeInfos} from "../../plugins/constants";
import { ApiInterceptor } from '../../plugins/backend';
describe('Public Contacts', () => {
    it('Sets public contacts, checks and unsets', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()
        new ApiInterceptor(routeInfos.GETUsersMe).wait().then((result)=>{
            ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.myProfileLink.click()
            ui.pages.personDetails.publicContacts.publicContactsSelection.click()
            ui.pages.personDetails.publicContacts.publicContactsSelection.getSelectionMenuByBloodGroup("AB+").click()
            ui.pages.personDetails.publicContacts.saveButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.POSTPublicContacts.notification)
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.publicContactsLink.click()
            ui.control.wait(1000)
            ui.pages.publicContacts.contains(result.response.body.donor.name)
            ui.components.topBar.drawerButton.click()
            ui.components.topBar.drawer.myProfileLink.click()
            ui.pages.personDetails.publicContacts.publicContactBloodGroups.getByIndex(0).click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETEPublicContacts.notification)

            // signout
            ui.components.topBar.tripleDotButton.click()
            ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
            ui.components.confirmationModal.okButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
        })
    })
})
