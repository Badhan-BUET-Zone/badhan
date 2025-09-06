import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        // go to members page and check whether at lease one volunteer, one hall admin and one super admin exists
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.membersLink.click()
        ui.pages.members.volunteers.getSample.exists()
        ui.pages.members.hallAdmins.getSample.exists()
        ui.pages.members.superAdmins.getSample.exists()

        // signout
        ui.control.scroll.top()
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
    })})
