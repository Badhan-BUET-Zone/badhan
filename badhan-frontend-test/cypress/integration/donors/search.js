import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
import {fakeDonorProfile, routeInfos} from "../../plugins/constants";
describe('Search', () => {
    it('should complete search for different filter options', () => {
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()
        ui.actions.createDonor(fakeDonorProfile)
    }
)})