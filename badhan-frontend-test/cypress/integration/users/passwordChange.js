import env from '../../plugins/env'
import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";

const newPassword = '123456789'

describe('Change password', () => {
    it('should change password and check', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        ui.actions.goToMyProfile()
        // change password
        ui.actions.changePassword(newPassword)

        // sign out
        ui.actions.signOut()
        
        // login with new password
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn(env.SUPERADMIN_PHONE, newPassword)
    })
})
