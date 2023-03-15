import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
describe('Admin Promotion', () => {
    it('should promote volunteer to admin', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

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
                ui.pages.home.filter.notAvailableCheckbox.click()
                ui.pages.home.filter.searchButton.click()
                
                // promote the volunteer to hall admin
                ui.pages.home.searchResult.personCards.getByIndex(0).click()
                ui.pages.home.searchResult.personCards.getByIndex(0).seeProfileButton.click()
                ui.pages.personDetails.settings.expansionButton.click()
                ui.pages.personDetails.settings.expansion.promoteToHallAdminButton.click()
                ui.components.notificationSnackBar.contains("Successfully changed hall admin")

                // sign out from UI
                ui.pages.personDetails.pageTitle.backButton.click()
                ui.components.topBar.tripleDotButton.click()
                ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
                ui.components.confirmationModal.okButton.click()
                ui.components.notificationSnackBar.contains("Logged out successfully")
            })
        })
    })})
