import { ui } from '../../plugins/frontend'
import {routeInfos} from "../../plugins/constants";
describe('Admin Promotion', () => {
    it('should promote volunteer to admin', () => {
        // sign in
        ui.actions.visitFirstPage()
        ui.actions.completeSignIn()

        // go to members page and get name and batch of first volunteer
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.membersLink.click()

        ui.pages.members.volunteers.getByIndex(0).name.then((firstVolunteerName)=>{
            ui.pages.members.volunteers.getByIndex(0).batch.then((firstVolunteerBatch)=>{
                // search that volunteer
                ui.components.topBar.drawerButton.click()
                ui.components.topBar.drawer.homeLink.click()
                ui.pages.home.filter.nameTextBox.type(firstVolunteerName)
                ui.pages.home.filter.batchTextBox.type(firstVolunteerBatch)
                ui.pages.home.filter.specifyHallRadioButton.click()
                ui.pages.home.filter.notAvailableCheckbox.check()
                ui.pages.home.filter.searchButton.click()
                
                // promote the volunteer to hall admin
                ui.pages.home.searchResult.personCards.getByIndex(0).click()
                ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
                ui.control.wait(1000)
                ui.pages.personDetails.settings.expansionButton.click()
                ui.pages.personDetails.settings.expansion.promoteToHallAdminButton.click()
                ui.components.notificationSnackBar.contains(routeInfos.PATCHAdmins.notification)
            })
        })
    })})
