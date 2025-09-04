import env from '../../plugins/env'
import { ApiInterceptor } from '../../plugins/backend'
import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";

describe('List of logins Test', () => {
        it('should get my profile, click for login records and delete a login',  () => {
            // sign in
            ui.actions.visitFirstPage()
            ui.actions.completeSignIn()

            // reset token and relogin
            ui.control.clearLocalStorage()
            ui.control.reload()
            ui.actions.completeSignIn()

            // go to my profile
            ui.actions.goToMyProfile()
            ui.pages.myProfile.settings.listOfLoginsButton.click()
            ui.control.scroll.bottom()

            // click to check logins and press delete login
            ui.pages.myProfile.settings.listOfLogins.getByIndex(0).deleteButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETELogins.notification)

            // signout from all devices
            ui.pages.myProfile.settings.listOfLogins.deleteAllLoginsButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETEUsersSignOutAll.notification)
        })
    }
)
