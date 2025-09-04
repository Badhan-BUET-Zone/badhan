import { ApiInterceptor } from '../../plugins/backend';
import env from '../../plugins/env'
import {ui} from "../../plugins/frontend";
import {routeInfos} from "../../plugins/constants";
describe('Active Donors', () => {
    it('mark as active donor, get active donors, and delete active donor', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        // make myself active donor
        ui.actions.goToMyProfile()
        ui.actions.markActiveDonor()
        
        // go to active donors page
        ui.actions.goToActiveDonors()

        // mark myself as not active again
        ui.actions.goToMyProfile()
        ui.actions.unmarkActiveDonor()

    })})

