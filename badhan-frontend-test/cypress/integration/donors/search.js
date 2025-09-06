import { ui } from '../../plugins/frontend'
import {fakeDonorProfile, routeInfos} from "../../plugins/constants";
describe('Search', () => {
    it('should complete search for different filter options', () => {
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()
        ui.actions.createDonor(fakeDonorProfile)
        ui.actions.searchDonor({
            name: fakeDonorProfile.name,
            bloodGroup: fakeDonorProfile.bloodGroup,
            batch: fakeDonorProfile.studentId.substring(0, 2),
            address: null,
            publicData: false,
            specifyHall: false,
            available: true,
            notAvailable: true
        })
    }
)})