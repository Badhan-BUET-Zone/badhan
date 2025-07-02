import env from '../../plugins/env'
import { ApiInterceptor } from '../../plugins/backend'
import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";

describe('List of logins Test', () => {
        it('should get my profile, click for login records and delete a login',  () => {
            // sign in
            ui.control.start()
            ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
            ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
            ui.pages.signIn.signInButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)

            // reset token and relogin
            ui.control.clearLocalStorage()
            ui.control.reload()
            ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
            ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
            ui.pages.signIn.signInButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.GETUsersSignIn.notification)

            // go to my profile
            ui.components.topBar.drawerButton.click()
            const interceptor = new ApiInterceptor(routeInfos.GETDonors)
            ui.components.topBar.drawer.myProfileLink.click()
            interceptor.wait()
            ui.pages.myProfile.settings.listOfLoginsButton.click()
            ui.control.scroll.botton()

            // click to check logins and press delete login
            ui.pages.myProfile.settings.listOfLogins.getByIndex(0).deleteButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETELogins.notification)

            // signout from all devices
            ui.pages.myProfile.settings.listOfLogins.deleteAllLoginsButton.click()
            ui.components.notificationSnackBar.contains(routeInfos.DELETEUsersSignOutAll.notification)
        })
    }
)
