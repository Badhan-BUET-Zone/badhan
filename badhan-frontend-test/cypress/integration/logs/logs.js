import { idStart } from '../../plugins/frontend/functions'
import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
import {routeInfos} from "../../plugins/constants";
describe('Logs', () => {
    it('gets logs', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)

        // go to superadmin menus and go to logs by date page
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.superAdminLink.click()
        ui.components.topBar.drawer.superAdminLink.statisticsLink.click()
        ui.pages.logs.logsByDateTab.logsByDate.getByIndex(0).detailsButton.click()
        ui.pages.logs.logsByDateTab.logsByDate.getByIndex(0).logsByPerson.getByIndex(0).expandButton.click()
        ui.pages.logs.logsByDateTab.logsByDate.getByIndex(0).logsByPerson.getByIndex(0).logObjects.getByIndex(0).clickMeButton.click()

        // check all volunteers page
        ui.pages.logs.allMembersTab.click()
        ui.pages.logs.allMembersTab.membersTable.exists()

        // check stats page
        ui.pages.logs.statsTab.click()
        ui.pages.logs.statsTab.numberOfDonors.exists()

        // signout
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains(routeInfos.DELETESignOut.notification)
    })
})
