import { ApiInterceptor } from '../../plugins/backend';
import env from '../../plugins/env'
import {ui} from "../../plugins/frontend";
import {routeInfos} from "../../plugins/constants";
describe('Active Donors', () => {
    it('mark as active donor, get active donors, and delete active donor', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        // make myself active donor
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.myProfileLink.click()
        ui.pages.personDetails.activeDonorButton.click()
        ui.pages.personDetails.activeDonorButton.activeDonorSwitch.click()
        ui.components.notificationSnackBar.contains(routeInfos.POSTActiveDonors.notification)
        
        // go to active donors page
        ui.components.topBar.drawerButton.click()
        const activeDonorInterceptor = new ApiInterceptor(routeInfos.GETActiveDonors)
        ui.components.topBar.drawer.activeDonorLink.click()
        activeDonorInterceptor.responseStatusCodeShouldBeEqualTo200()

        // mark myself as not active again
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.myProfileLink.click()
        ui.control.wait(1000)
        ui.pages.personDetails.activeDonorButton.click()
        ui.pages.personDetails.activeDonorButton.activeDonorSwitch.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETEActiveDonors.notification)

        // signout
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
    })})

